import { tag7 } from '../../../shared/util7'
import { useState } from 'react'
export function Ui6() { const [n,setN]=useState(0); return <span data-ui="6" onClick={()=>setN(n+1)}>Ui6 {tag7} {n}</span> }
