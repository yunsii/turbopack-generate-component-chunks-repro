import { tag4 } from '../../../shared/util4'
import { useState } from 'react'
export function Ui3() { const [n,setN]=useState(0); return <span data-ui="3" onClick={()=>setN(n+1)}>Ui3 {tag4} {n}</span> }
