import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section> }
export function Jersey({ type = 'yellow', small = false }: { type?: string; small?: boolean }) { return <span className={`jersey ${type} ${small ? 'small' : ''}`}><i /></span> }
export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) { return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div> }
export function EmptyGuide({ icon, eyebrow, title, text, preview, action }: { icon: ReactNode; eyebrow: string; title: string; text: string; preview: ReactNode; action?: ReactNode }) { return <Card className="empty-guide"><span className="empty-guide-icon">{icon}</span><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p><div className="guide-preview"><span>SO KANN ES AUSSEHEN</span>{preview}</div>{action}</Card> }
