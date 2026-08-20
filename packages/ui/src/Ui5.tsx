import { tag6 } from '../../../shared/util6'
import { useState } from 'react'
export function Ui5() { const [n,setN]=useState(0); return <span data-ui="5" onClick={()=>setN(n+1)}>Ui5 {tag6} {n}</span> }
