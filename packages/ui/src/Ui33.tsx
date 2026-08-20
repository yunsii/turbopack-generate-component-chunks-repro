import { tag2 } from '../../../shared/util2'
import { useState } from 'react'
export function Ui33() { const [n,setN]=useState(0); return <span data-ui="33" onClick={()=>setN(n+1)}>Ui33 {tag2} {n}</span> }
