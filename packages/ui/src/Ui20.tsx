import { tag5 } from '../../../shared/util5'
import { useState } from 'react'
export function Ui20() { const [n,setN]=useState(0); return <span data-ui="20" onClick={()=>setN(n+1)}>Ui20 {tag5} {n}</span> }
