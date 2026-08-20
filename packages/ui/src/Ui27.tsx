import { tag4 } from '../../../shared/util4'
import { useState } from 'react'
export function Ui27() { const [n,setN]=useState(0); return <span data-ui="27" onClick={()=>setN(n+1)}>Ui27 {tag4} {n}</span> }
