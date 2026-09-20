import { useEffect, useRef, useState } from 'react'
import { Button, Input, Space, Typography, Upload } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { SkinAsset } from '../landingSkin'
import { LANDING_SKIN_ASSET_DB } from '../landingSkin'

const { Text } = Typography

function assetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(LANDING_SKIN_ASSET_DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('files')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export async function putSkinFile(id: string, file: File) {
  const db = await assetDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite')
      tx.objectStore('files').put(file, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function getSkinFile(id: string): Promise<Blob | undefined> {
  const db = await assetDB()
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction('files').objectStore('files').get(id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  } finally {
    db.close()
  }
}

export function useSkinAssetURL(asset?: SkinAsset) {
  const [state, setState] = useState<{ src?: string; error?: string }>({})
  useEffect(() => {
    let alive = true
    let url: string | undefined
    setState({})
    if (!asset?.src) return
    if (!asset.src.startsWith('asset:')) {
      setState({ src: asset.src })
      return
    }
    getSkinFile(asset.src.slice(6))
      .then((blob) => {
        if (!blob) throw Error('本地素材不存在，请重新上传')
        url = URL.createObjectURL(blob)
        if (alive) setState({ src: url })
        else URL.revokeObjectURL(url)
      })
      .catch((e) => {
        if (alive) setState({ error: (e as Error).message })
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset?.src])
  return state
}

export function SkinMedia({ asset, className = '', alt = '' }: { asset?: SkinAsset; className?: string; alt?: string }) {
  const { src, error } = useSkinAssetURL(asset)
  if (!asset?.src) return null
  if (error) return <div className={`skin-media-fallback ${className}`}>{error}</div>
  if (!src) return <div className={`skin-media-fallback ${className}`}>加载中…</div>
  if (asset.kind === 'video') return <video className={className} src={src} autoPlay muted loop playsInline />
  return <img className={className} src={src} alt={alt || asset.name || ''} />
}

export default function SkinAssetField({
  label,
  hint,
  value,
  onChange,
  acceptVideo = false,
  required = false,
}: {
  label: string
  hint?: string
  value?: SkinAsset
  onChange: (next?: SkinAsset) => void
  acceptVideo?: boolean
  required?: boolean
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = useRef(onChange)
  latest.current = onChange
  const accept = acceptVideo
    ? 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'
    : 'image/png,image/jpeg,image/webp,image/gif'

  const upload = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      const video = file.type.startsWith('video/')
      if (video && !acceptVideo) throw Error('该位置仅支持图片')
      if (file.size > 12 * 1024 * 1024) throw Error('原型单文件上限 12 MB')
      const id = crypto.randomUUID()
      await putSkinFile(id, file)
      latest.current({
        id,
        kind: video ? 'video' : 'image',
        src: `asset:${id}`,
        name: file.name,
        mime: file.type,
        bytes: file.size,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
    return false
  }

  return (
    <div className="skin-asset-field">
      <div className="skin-field-label">
        {required ? <em>*</em> : null}
        {label}
      </div>
      <div className="skin-upload-box">
        {value?.src ? (
          <div className="skin-upload-preview">
            <SkinMedia asset={value} />
            <div className="skin-upload-actions">
              <Upload accept={accept} showUploadList={false} disabled={busy} beforeUpload={upload}>
                <Button size="small">替换</Button>
              </Upload>
              <Button size="small" icon={<DeleteOutlined />} onClick={() => onChange(undefined)}>
                清除
              </Button>
            </div>
          </div>
        ) : (
          <Upload accept={accept} showUploadList={false} disabled={busy} beforeUpload={upload}>
            <button type="button" className="skin-upload-plus" disabled={busy}>
              <PlusOutlined />
              <span>点击上传</span>
            </button>
          </Upload>
        )}
      </div>
      <Space.Compact style={{ width: 'min(420px, 100%)', marginTop: 8 }}>
        <Input
          placeholder="或粘贴 HTTPS 图片 / 视频地址"
          value={value?.src?.startsWith('asset:') ? '' : value?.src ?? ''}
          onChange={(e) => {
            const src = e.target.value.trim()
            onChange(src ? { id: value?.id || crypto.randomUUID(), kind: acceptVideo && /\.(mp4|webm)$/i.test(src) ? 'video' : 'image', src, name: src } : undefined)
          }}
        />
      </Space.Compact>
      {hint ? <Text type="secondary" className="skin-asset-hint">{hint}</Text> : null}
      {value?.name ? <Text type="secondary">{value.name}</Text> : null}
      {error ? <div className="skin-field-error">{error}</div> : null}
    </div>
  )
}
