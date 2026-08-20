import { tag2 } from '../../../shared/util2'
import { useState } from 'react'
export function Ui17() { const [n,setN]=useState(0); return <span data-ui="17" onClick={()=>setN(n+1)}>Ui17 {tag2} {n}</span> }
