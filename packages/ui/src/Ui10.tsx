import { tag3 } from '../../../shared/util3'
import { useState } from 'react'
export function Ui10() { const [n,setN]=useState(0); return <span data-ui="10" onClick={()=>setN(n+1)}>Ui10 {tag3} {n}</span> }
