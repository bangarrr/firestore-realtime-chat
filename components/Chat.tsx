import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  startAt
} from "firebase/firestore";
import {db} from "@/libs/firebase";
import {useEffect, useState} from "react";
import dayjs from "dayjs";
import 'dayjs/locale/ja';
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.locale('ja');
dayjs.updateLocale('ja', {
  relativeTime: {
    future: '%s後',
    past: '%s前',
    s: '少し',
    m: '1分',
    mm: '%d分',
    h: '1時間',
    hh: '%d時間',
    d: '1日',
    dd: '%d日',
    M: '1月',
    MM: '%d月',
    y: '1年',
    yy: '%d年',
  },
});
import ScrollableCommentList from "@/components/ScrollableCommentList";
import firebase from "firebase/compat";
import DocumentData = firebase.firestore.DocumentData;

export type Message = {
  id: string;
  text: string;
  date: number;
}

type ChangedData = {
  type: string;
  newIndex: number;
  oldIndex: number;
  data: Message;
}

export const MessageLimit = 10

const Chat = () => {
  const messageRef = collection(db, "messages")
  const [message, setMessage] = useState('')
  const [monitoringMessages, setMonitoringMessages] = useState<Message[]>([])
  const [observeFrom, setObserveFrom] = useState<DocumentData | null>(null)

  const updateMessages = (changes: ChangedData[]) => {
    setMonitoringMessages(prev => {
      const newMessages = [...prev]

      changes.forEach(change => {
        if (change.type === "added") {
          newMessages.push(change.data)
        } else if (change.type === "modified") {
          const index = newMessages.findIndex(item => item.id === change.data.id)
          if (index >= 0) newMessages.splice(index, 1, change.data)
        }
        if (change.type === "removed") {
          const index = newMessages.findIndex(item => item.id === change.data.id)
          if (index >= 0) newMessages.splice(index, 1)
        }
      })

      return newMessages
    })
  }

  const deleteMessage = (id: string) => {
    deleteDoc(doc(messageRef, id))
  }

  useEffect(() => {
    const initialize = async () => {
      const q = query(messageRef, orderBy('date', 'desc'), limit(MessageLimit))
      const docs = (await getDocs(q)).docs
      const oldestMessage = docs[docs.length - 1]
      setObserveFrom(oldestMessage)
    }
    initialize()
  }, [])

  useEffect(() => {
    if (!observeFrom) return

    const createListener = () => {
      const q = query(messageRef, orderBy('date'), startAt(observeFrom))

      return onSnapshot(q, (querySnapshot) => {
        const changedData: ChangedData[] = []

        querySnapshot.docChanges().forEach((change) => {
          const data = change.doc.data()

          changedData.push({
            type: change.type,
            newIndex: change.newIndex,
            oldIndex: change.oldIndex,
            data: {
              id: change.doc.id,
              text: data.text,
              date: data.date
            }
          })
        })

        updateMessages(changedData)
      })
    }

    const listener = createListener()

    return () => listener()
  }, [observeFrom])

  const sendMessage = async () => {
    if (message.length === 0) return

    await addDoc(messageRef, {
      text: message,
      date: new Date().getTime()
    })
    setMessage('')
  }

  return (
    <>
      <div style={{
        padding: "20px",
        borderBottom: "1px solid #ccc"
      }}>
        チャットページ
      </div>

      <div style={{maxWidth: '960px', margin: '0 auto', padding: '0 20px'}}>
        {!!observeFrom && (
          <ScrollableCommentList
            monitoringMessages={monitoringMessages}
            deleteMonitoringMessage={deleteMessage}
            observeFrom={observeFrom}
          />
        )}
        <div>
          <input
            type="text"
            placeholder="メッセージを入力"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                sendMessage()
              }
            }}
          />
          <button onClick={sendMessage}>
            送信
          </button>
        </div>
      </div>
    </>
  )
}

export default Chat