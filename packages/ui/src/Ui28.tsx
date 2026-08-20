import { tag5 } from '../../../shared/util5'
import { useState } from 'react'
export function Ui28() { const [n,setN]=useState(0); return <span data-ui="28" onClick={()=>setN(n+1)}>Ui28 {tag5} {n}</span> }
