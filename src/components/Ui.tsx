import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section> }
export function Jersey({ type = 'yellow', small = false }: { type?: string; small?: boolean }) { return <span className={`jersey ${type} ${small ? 'small' : ''}`}><i /></span> }
export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) { return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div> }
