import type { ReactNode } from 'react';
import { useI18n } from './i18n';

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
 return <section id={'guide-' + id} className="guide-section" tabIndex={-1}><h2><a href={'#guide-' + id}>{title}</a></h2>{children}</section>;
}

export function Table({ heads, rows }: { heads: string[]; rows: string[][] }) {
 const { t } = useI18n();
 return <div className="guide-table-wrap" tabIndex={0} role="region" aria-label={heads.join(t('与', ' / '))}><table><thead><tr>{heads.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
}
