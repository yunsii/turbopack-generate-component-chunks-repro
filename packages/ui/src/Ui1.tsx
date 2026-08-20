import { tag2 } from '../../../shared/util2'
import { useState } from 'react'
export function Ui1() { const [n,setN]=useState(0); return <span data-ui="1" onClick={()=>setN(n+1)}>Ui1 {tag2} {n}</span> }
