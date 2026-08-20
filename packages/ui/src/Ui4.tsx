import { tag5 } from '../../../shared/util5'
import { useState } from 'react'
export function Ui4() { const [n,setN]=useState(0); return <span data-ui="4" onClick={()=>setN(n+1)}>Ui4 {tag5} {n}</span> }
