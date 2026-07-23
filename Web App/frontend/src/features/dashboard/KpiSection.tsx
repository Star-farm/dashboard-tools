import type { Translation } from '../../i18n';
import type { KpiChangeResult } from '../../types/dashboard';
import { USD_TO_VND } from './dashboardConfig';

interface KpiCard {
    key: string;
    label: string;
    unit: string;
    lowerIsBetter?: boolean;
}

interface KpiSectionProps {
    t: Translation;
    language: 'vi' | 'en';
    cards: KpiCard[];
    changes: KpiChangeResult | null;
    loading: boolean;
}

export function KpiSection({ t, language, cards, changes, loading }: KpiSectionProps) {
    return (
        <section className="glass-panel">
            <h2>{t.kpiSectionTitle}</h2>
            <div className="metrics-row">
                {cards.map((card) => {
                    const entry = changes?.kpis?.[card.key];
                    const percentage = entry?.pct_change;
                    const isGood = percentage != null && (card.lowerIsBetter ? percentage < 0 : percentage > 0);
                    const colorClass = percentage == null ? '' : isGood ? 'text-success' : 'text-danger';
                    const arrow = percentage == null ? '' : percentage > 0 ? '▲' : percentage < 0 ? '▼' : '—';
                    const isVnd = language === 'vi' && card.key === 'Net Income';
                    const targetValue = entry?.target_value;
                    const displayValue = targetValue != null && isVnd
                        ? Number((targetValue * USD_TO_VND / 1_000_000).toFixed(1))
                        : targetValue;
                    const displayUnit = isVnd ? t.netIncomeVndUnit : card.unit;

                    return (
                        <div className="metric-card" key={card.key}>
                            <span className="label">{card.label}</span>
                            <span className={`value ${colorClass}`}>
                                {loading ? t.loading : percentage != null
                                    ? `${arrow} ${Math.abs(percentage).toFixed(1)}%`
                                    : t.notAvailable}
                            </span>
                            <span className={`subtext ${colorClass}`}>
                                {t.kpiChangeTitle}
                                {displayValue != null && (
                                    <> &middot; {t.kpiTargetYear}: {displayValue.toLocaleString(undefined, {
                                        minimumFractionDigits: isVnd ? 1 : 0,
                                        maximumFractionDigits: isVnd ? 1 : 0,
                                    })} {displayUnit}</>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
