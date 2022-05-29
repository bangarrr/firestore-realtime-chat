import InfiniteScroll from "react-infinite-scroller";
import {useEffect, useRef, useState} from "react";
import dayjs from "dayjs";
import {Message} from "@/components/Chat";
import {collection, orderBy, query, startAfter, limit, getDocs, deleteDoc, doc} from "firebase/firestore";
import {db} from "@/libs/firebase";
import firebase from "firebase/compat";
import DocumentData = firebase.firestore.DocumentData;
import { MessageLimit } from "./Chat"

type Props = {
  monitoringMessages: Message[]
  deleteMonitoringMessage: (id: string) => void
  observeFrom: DocumentData | null
}

export const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const ScrollableCommentList: React.FC<Props> = ({monitoringMessages, deleteMonitoringMessage, observeFrom}) => {
  const messageRef = collection(db, "messages")
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true)
  const [unmonitoredMessages, setUnmonitoredMessages] = useState<Message[]>([])
  const [oldestMessage, setOldestMessage] = useState<DocumentData | null>(observeFrom)

  useEffect(() => {
    if (monitoringMessages.length > 0) {
      scrollBottomRef?.current?.scrollIntoView();
    }
  }, [monitoringMessages]);

  const fetchMoreMessages = async () => {
    if (!oldestMessage) return

    await sleep(2000)
    const searchQuery = query(
      messageRef,
      orderBy('date', 'desc'),
      startAfter(oldestMessage),
      limit(MessageLimit)
    )
    const docs = (await getDocs(searchQuery)).docs
    const messages: Message[] = []
    for (const doc of docs) {
      const data = doc.data()
      messages.push({
        id: doc.id,
        text: data.text,
        date: data.date
      })
    }
    setHasMore(messages.length === MessageLimit)
    setOldestMessage(docs[docs.length - 1])
    setUnmonitoredMessages([...messages.reverse(), ...unmonitoredMessages])
  }

  const deleteUnmonitoredMessage = (id: string) => {
    deleteDoc(doc(messageRef, id))
    const messages = [...unmonitoredMessages]
    const index = messages.findIndex(m => m.id === id)
    messages.splice(index, 1)
    setUnmonitoredMessages(messages)
  }

  return (
    <div style={{ height: '600px', overflow: 'auto' }}>
      <InfiniteScroll
        loadMore={fetchMoreMessages}
        loader={
          <div key={0} style={{ textAlign: 'center', padding: '20px 0', backgroundColor: '#73B3D9'}}>
            ローディング...
          </div>
        }
        hasMore={hasMore}
        isReverse={true}
        initialLoad={false}
        useWindow={false}
      >
        {unmonitoredMessages.map((m) => (
          <MessageItem message={m} deleteMessage={deleteUnmonitoredMessage} key={m.id}/>
        ))}
        {monitoringMessages.map((m) => (
          <MessageItem message={m} deleteMessage={deleteMonitoringMessage} monitoring={true} key={m.id}/>
        ))}
      </InfiniteScroll>
      {/* 最下部へのスクロール用div */}
      <div ref={scrollBottomRef}></div>
    </div>
  )
}

const MessageItem: React.FC<{message: Message, deleteMessage: (id: string) => void, monitoring?: boolean}> = (
  {message, deleteMessage, monitoring = false}
) => {
  return (
    <div
      style={{
        padding: "20px",
        margin: "8px 0",
        boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: monitoring ? '#fff': '#eee'
      }}
    >
      <div>
        <span>{message.text}</span>
        <div style={{ fontSize: '0.8rem', color: '#aaa'}}>{dayjs(message.date).fromNow()}</div>
      </div>
      <button onClick={() => deleteMessage(message.id)}>削除</button>
    </div>
  )
}

export default ScrollableCommentList