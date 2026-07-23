# Model Documentation

This document describes the model implemented by both `backend` and `VPS`. The current artifact version is `v13_model_bundle`.

## Prediction flow

```text
User input
  + selected scenario and AWD adoption
  + each unique valid 2050 resource/season/climate combination
                         |
                         v
              four Random Forest models
                         |
        +----------------+----------------+
        |                |                |
     Yield           Methane       Revenue and Cost
        |                |                |
        +------> Emission Intensity       +------> Net Income
                                                   + Profit Margin
                         |
                         v
       equal mean across the unique valid combinations
                         |
                         v
              prediction + P90 interval
```

## Inputs

Each Random Forest receives these nine features in this order:

| Feature | Treatment during training and inference |
| --- | --- |
| AWD Adoption | Label encoded categorical value |
| Scenario Group | Label encoded categorical value |
| Year | Numeric; simulation inference is fixed at `2050` |
| Resource Scenario | Label encoded categorical value |
| Season Type | Label encoded categorical value |
| Climate Type | Label encoded categorical value |
| Fertilizer Usage | Numeric, accepted range `80-145` |
| Pesticide Usage | Numeric, accepted range `4-7.5` |
| Water Usage | Numeric, accepted range `0-850` |

The user supplies AWD adoption, scenario group, fertilizer, pesticide, and water. Resource Scenario, Season Type, and Climate Type are not user inputs: the service obtains every unique valid combination present for the selected scenario in the 2050 dataset.

## Direct model targets

Four independent `RandomForestRegressor` models are trained with 100 trees, `random_state=42`, and all available CPU cores:

1. Avg Yield
2. Methane Emissions
3. Revenue
4. Production Cost

For a forest with `T = 100` trees, a direct prediction can be represented as:

```text
y_hat(x) = (1 / T) * sum(tree_t(x), t=1..T)
```

Revenue is reconstructed in the training frame from the source financial columns:

```text
Revenue = Net Income + Production Cost
```

Production Cost is predicted directly. Net Income is then calculated as Revenue minus Production Cost; there is no labor-based cost calibration in the serving path.

## Derived output formulas

The service clamps predicted yield, methane, and production cost to zero before deriving the remaining outputs.

```text
Production Cost = max(0, predicted Production Cost)

Net Income = predicted Revenue - Production Cost

Profit Margin (%) = Net Income / max(1, predicted Revenue) * 100

Emission Intensity = Methane Emissions / max(1, Avg Yield * 1000)
```

With yield expressed in tonnes per hectare and methane in kilograms per hectare, emission intensity is reported as kilograms of methane per kilogram of product by the backend calculation. The frontend currently labels it `kg CH4/t`; that display unit should be reviewed separately if a per-tonne value is intended, because the code includes the `1000` conversion in the denominator.

## Context aggregation

For a selected scenario, let `C` be the set of unique valid 2050 tuples:

```text
(Resource Scenario, Season Type, Climate Type)
```

The service predicts once for every tuple in `C`. The final value for metric `m` is the unweighted arithmetic mean:

```text
final_m = (1 / |C|) * sum(prediction_m(c), c in C)
```

Duplicate source rows do not give a context extra weight because the tuples are deduplicated before prediction. No frequency-based or weighted-context aggregation is used.

Derived financial values and emission intensity are calculated for each context first and then averaged. Consequently, the displayed Profit Margin is the mean of the context-level margins, not necessarily the ratio calculated again from the final mean Net Income and mean Revenue.

## Evaluation

Evaluation uses a group-aware 80/20 holdout with `random_state=42`. Rows are grouped by the available columns among:

```text
Scenario Name, Resource Scenario, Climate Type, Season Type
```

The report contains R-squared, MAE, RMSE, cross-validation R-squared, target profiles, and permutation feature importance. Group-aware cross-validation uses up to five folds.

Net Income and Profit Margin are also evaluated as derived targets by predicting Revenue and Production Cost on a group-aware holdout and applying the formulas above.

## P90 prediction intervals

For each evaluated target, the service calculates the absolute validation residuals:

```text
error_i = abs(actual_i - predicted_i)
q90 = 90th percentile(error_i, method="higher")
```

The direct interval around a point prediction is:

```text
lower = prediction - q90
upper = prediction + q90
```

Non-negative targets have their lower bound clamped to zero. The interval level returned by the API is `0.9`.

Financial fallback intervals propagate the Revenue and Production Cost limits conservatively:

```text
Net Income lower = Revenue lower - Production Cost upper
Net Income upper = Revenue upper - Production Cost lower
```

When validation residuals for derived Net Income and Profit Margin are available, those derived P90 intervals replace the propagated fallback intervals.

Emission Intensity propagates the Yield and Methane bounds:

```text
EI lower = Methane lower / (Yield upper * 1000)
EI upper = Methane upper / (Yield lower * 1000)
```

P90 is an empirical validation-error range, not a guarantee that every future observation has a 90% probability of falling inside the interval. Its reliability depends on how representative the simulation dataset and validation groups are of future user inputs.

## Implementation locations

| Concern | Backend | VPS |
| --- | --- | --- |
| Training, prediction, formulas, aggregation, intervals | `backend/app/mcp/server.py` | `VPS/app/mcp/server.py` |
| Evaluation and residual quantile | `backend/app/ml/evaluation.py` | `VPS/app/ml/evaluation.py` |
| API response | `backend/app/api/server.py` | `VPS/app/api/server.py` |
| Frontend interval rendering | `frontend/src/hooks/useDashboardData.ts` | Shared frontend |

Whenever targets, features, formulas, aggregation, model hyperparameters, or interval logic change, increment the cache version and update this document together with both service variants.
