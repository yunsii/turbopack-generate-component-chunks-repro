import { tag3 } from '../../../shared/util3'
import { useState } from 'react'
export function Ui26() { const [n,setN]=useState(0); return <span data-ui="26" onClick={()=>setN(n+1)}>Ui26 {tag3} {n}</span> }
