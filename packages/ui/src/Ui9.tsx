import { tag2 } from '../../../shared/util2'
import { useState } from 'react'
export function Ui9() { const [n,setN]=useState(0); return <span data-ui="9" onClick={()=>setN(n+1)}>Ui9 {tag2} {n}</span> }
