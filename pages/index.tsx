import type { NextPage } from 'next'
import Chat from "@/components/Chat";
import { collection, onSnapshot } from "firebase/firestore"
import {db} from "@/libs/firebase";

const Home: NextPage = () => {
  return (
    <Chat/>
  )
}

export default Home
