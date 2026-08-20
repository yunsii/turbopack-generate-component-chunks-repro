import { tag3 } from '../../../shared/util3'
import { useState } from 'react'
export function Ui2() { const [n,setN]=useState(0); return <span data-ui="2" onClick={()=>setN(n+1)}>Ui2 {tag3} {n}</span> }
