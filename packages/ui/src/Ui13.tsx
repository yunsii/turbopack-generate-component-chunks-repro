import { tag6 } from '../../../shared/util6'
import { useState } from 'react'
export function Ui13() { const [n,setN]=useState(0); return <span data-ui="13" onClick={()=>setN(n+1)}>Ui13 {tag6} {n}</span> }
