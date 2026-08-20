import { tag5 } from '../../../shared/util5'
import { useState } from 'react'
export function Ui12() { const [n,setN]=useState(0); return <span data-ui="12" onClick={()=>setN(n+1)}>Ui12 {tag5} {n}</span> }
