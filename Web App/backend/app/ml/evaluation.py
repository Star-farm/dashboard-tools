"""Group-aware evaluation, profiling, quality gates, and explainability."""
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit

GROUP_COLUMNS = ["Scenario Name", "Resource Scenario", "Climate Type", "Season Type"]
QUALITY_GATES = {
    "Avg Yield": {"min_r2": .75, "max_mae": .4},
    "Methane Emissions": {"min_r2": .70, "max_mae": 80.0},
    "Revenue": {"min_r2": .60, "max_mae": 250.0},
    "Labor Intensity": {"min_r2": .70, "max_mae": 20.0},
    "Flood Stress": {"min_r2": .20, "max_mae": 1.5},
}

def build_groups(df):
    cols = [c for c in GROUP_COLUMNS if c in df]
    return df[cols].fillna("missing").astype(str).agg("|".join, axis=1) if cols else pd.Series(np.arange(len(df)), index=df.index)

def profile_target(series):
    values = pd.to_numeric(series, errors="coerce")
    valid = values.dropna()
    return {"rows": len(series), "missing": int(values.isna().sum()), "unique": int(valid.nunique()),
            "min": float(valid.min()), "max": float(valid.max()), "mean": float(valid.mean()),
            "std": float(valid.std(ddof=0))}

def evaluate(model, X, y, groups):
    train, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(X, y, groups))
    candidate = clone(model).fit(X.iloc[train], y.iloc[train])
    predicted = candidate.predict(X.iloc[test])
    result = {"r2": float(r2_score(y.iloc[test], predicted)), "mae": float(mean_absolute_error(y.iloc[test], predicted)),
              "rmse": float(mean_squared_error(y.iloc[test], predicted) ** .5)}
    scores = []
    folds = min(5, int(groups.nunique()))
    if folds >= 2:
        for a, b in GroupKFold(folds).split(X, y, groups):
            fitted = clone(model).fit(X.iloc[a], y.iloc[a])
            scores.append(r2_score(y.iloc[b], fitted.predict(X.iloc[b])))
    result.update(cv_r2_mean=float(np.mean(scores)) if scores else result["r2"], cv_r2_std=float(np.std(scores)) if scores else 0.0)
    pi=permutation_importance(candidate, X.iloc[test], y.iloc[test], n_repeats=3, random_state=42, n_jobs=-1)
    importance=sorted(({"feature": n, "importance": float(v)} for n,v in zip(X.columns,pi.importances_mean)), key=lambda x:x["importance"], reverse=True)
    return result, importance

def gate_passed(target, metrics):
    gate=QUALITY_GATES.get(target)
    return True if gate is None else metrics["r2"] >= gate["min_r2"] and metrics["mae"] <= gate["max_mae"]

def metadata(version, fingerprint, rows):
    return {"model_version": version, "dataset_fingerprint": fingerprint, "training_rows": rows,
            "trained_at": datetime.now(timezone.utc).isoformat(), "sklearn_version": sklearn.__version__,
            "split_strategy": "group", "group_columns": GROUP_COLUMNS}
