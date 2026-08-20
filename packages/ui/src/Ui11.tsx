import { tag4 } from '../../../shared/util4'
import { useState } from 'react'
export function Ui11() { const [n,setN]=useState(0); return <span data-ui="11" onClick={()=>setN(n+1)}>Ui11 {tag4} {n}</span> }
