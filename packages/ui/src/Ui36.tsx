import { tag5 } from '../../../shared/util5'
import { useState } from 'react'
export function Ui36() { const [n,setN]=useState(0); return <span data-ui="36" onClick={()=>setN(n+1)}>Ui36 {tag5} {n}</span> }
