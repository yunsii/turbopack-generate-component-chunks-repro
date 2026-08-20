import { tag6 } from '../../../shared/util6'
import { useState } from 'react'
export function Ui21() { const [n,setN]=useState(0); return <span data-ui="21" onClick={()=>setN(n+1)}>Ui21 {tag6} {n}</span> }
