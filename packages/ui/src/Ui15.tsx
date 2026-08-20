import { tag8 } from '../../../shared/util8'
import { useState } from 'react'
export function Ui15() { const [n,setN]=useState(0); return <span data-ui="15" onClick={()=>setN(n+1)}>Ui15 {tag8} {n}</span> }
