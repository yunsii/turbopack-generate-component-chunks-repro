import { tag2 } from '../../../shared/util2'
import { useState } from 'react'
export function Ui25() { const [n,setN]=useState(0); return <span data-ui="25" onClick={()=>setN(n+1)}>Ui25 {tag2} {n}</span> }
