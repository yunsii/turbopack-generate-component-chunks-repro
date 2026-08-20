import { tag3 } from '../../../shared/util3'
import { useState } from 'react'
export function Ui18() { const [n,setN]=useState(0); return <span data-ui="18" onClick={()=>setN(n+1)}>Ui18 {tag3} {n}</span> }
