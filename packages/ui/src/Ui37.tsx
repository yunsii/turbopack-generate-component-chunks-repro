import { tag6 } from '../../../shared/util6'
import { useState } from 'react'
export function Ui37() { const [n,setN]=useState(0); return <span data-ui="37" onClick={()=>setN(n+1)}>Ui37 {tag6} {n}</span> }
