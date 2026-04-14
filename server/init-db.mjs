import 'dotenv/config'

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@mira.local'
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'mira12345678'

async function initDB() {
  console.log(`Connecting to PocketBase at ${PB_URL}...`)

  try {
    // 1. Authenticate as superuser
    console.log('Authenticating...')
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    })

    if (!authRes.ok) {
      console.error('Failed to authenticate:', await authRes.json())
      process.exit(1)
    }

    const { token } = await authRes.json()
    console.log('Authenticated successfully!')

    // Helper: get collection ID by name
    const getCollectionId = async (name) => {
      const res = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: { Authorization: token }
      })
      if (res.ok) {
        const col = await res.json()
        return col.id
      }
      return null
    }

    // Helper: update collection fields via PATCH
    const updateCollectionFields = async (name, fields) => {
      const res = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: { Authorization: token }
      })
      if (!res.ok) {
        console.error(`Collection '${name}' not found!`)
        return
      }
      const col = await res.json()

      // Merge: keep existing system fields (like id), add our custom fields
      const existingFieldNames = col.fields.map(f => f.name)
      const newFields = [...col.fields]
      for (const field of fields) {
        if (!existingFieldNames.includes(field.name)) {
          newFields.push(field)
        }
      }

      console.log(`[UPDATE] Adding fields to '${name}'...`)
      const updateRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ fields: newFields })
      })
      if (!updateRes.ok) {
        const errText = await updateRes.text()
        console.error(`Failed to update '${name}':`, errText)
      } else {
        console.log(`[OK] '${name}' fields updated successfully`)
      }
    }

    // Helper: create collection if not exists
    const ensureCollection = async (name, type, fields, rules) => {
      const existing = await getCollectionId(name)
      if (existing) {
        console.log(`Collection '${name}' exists, updating fields...`)
        await updateCollectionFields(name, fields)
        return
      }

      console.log(`[CREATE] Creating collection '${name}'...`)
      const createRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ name, type, fields, ...rules })
      })
      if (!createRes.ok) {
        console.error(`Failed to create '${name}':`, await createRes.text())
      } else {
        console.log(`[OK] '${name}' created successfully`)
      }
    }

    // Get users collection ID for relations
    const usersColId = await getCollectionId('users')
    if (!usersColId) {
      console.error('users collection not found!')
      process.exit(1)
    }
    console.log(`Users collection ID: ${usersColId}`)

    // ---- Update USERS collection with custom fields ----
    await updateCollectionFields('users', [
      { name: 'displayName', type: 'text', required: false },
      { name: 'avatarUrl', type: 'text', required: false },
      { name: 'bio', type: 'text', required: false },
      { name: 'language', type: 'text', required: false },
      { name: 'isOnline', type: 'bool', required: false },
      { name: 'lastSeen', type: 'date', required: false },
    ])

    const openRules = { listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '' }

    // Autodate fields required by PocketBase v0.22+ for sort/filter by created/updated
    const autodateFields = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false, hidden: false, system: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true, hidden: false, system: false },
    ]

    // ---- CHATS ----
    await ensureCollection('chats', 'base', [
      ...autodateFields,
      { name: 'type', type: 'text', required: true },
      { name: 'name', type: 'text', required: false },
      { name: 'avatarUrl', type: 'text', required: false },
      { name: 'createdBy', type: 'relation', required: false, collectionId: usersColId, maxSelect: 1 },
      { name: 'pinnedMessageId', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'isArchived', type: 'bool', required: false },
    ], openRules)

    const chatsColId = await getCollectionId('chats')

    // ---- CHAT MEMBERS ----
    await ensureCollection('chatMembers', 'base', [
      ...autodateFields,
      { name: 'chatId', type: 'relation', required: true, collectionId: chatsColId, maxSelect: 1, cascadeDelete: true },
      { name: 'userId', type: 'relation', required: true, collectionId: usersColId, maxSelect: 1, cascadeDelete: true },
      { name: 'role', type: 'text', required: false },
      { name: 'isMuted', type: 'bool', required: false },
      { name: 'notificationsEnabled', type: 'bool', required: false },
      { name: 'joinedAt', type: 'date', required: false },
    ], openRules)

    // ---- MESSAGES ----
    await ensureCollection('messages', 'base', [
      ...autodateFields,
      { name: 'chatId', type: 'relation', required: true, collectionId: chatsColId, maxSelect: 1, cascadeDelete: true },
      { name: 'senderId', type: 'relation', required: true, collectionId: usersColId, maxSelect: 1, cascadeDelete: true },
      { name: 'type', type: 'text', required: true },
      { name: 'content', type: 'text', required: false },
      { name: 'fileUrl', type: 'text', required: false },
      { name: 'fileName', type: 'text', required: false },
      { name: 'fileSize', type: 'number', required: false },
      { name: 'duration', type: 'number', required: false },
      { name: 'linkPreview', type: 'json', required: false },
      { name: 'replyToId', type: 'text', required: false },
      { name: 'forwardedFromId', type: 'text', required: false },
      { name: 'forwardedFromChatId', type: 'text', required: false },
      { name: 'isEdited', type: 'bool', required: false },
      { name: 'isDeleted', type: 'bool', required: false },
      { name: 'editedAt', type: 'date', required: false },
      { name: 'file', type: 'file', required: false, maxSelect: 1, maxSize: 52428800, thumbs: ['200x200'] },
    ], openRules)

    const messagesColId = await getCollectionId('messages')

    // ---- MESSAGE READS ----
    await ensureCollection('messageReads', 'base', [
      ...autodateFields,
      { name: 'chatId', type: 'relation', required: true, collectionId: chatsColId, maxSelect: 1, cascadeDelete: true },
      { name: 'userId', type: 'relation', required: true, collectionId: usersColId, maxSelect: 1, cascadeDelete: true },
      { name: 'lastReadMessageId', type: 'text', required: true },
      { name: 'readAt', type: 'date', required: true },
    ], openRules)

    // ---- USER DEVICES ----
    await ensureCollection('userDevices', 'base', [
      ...autodateFields,
      { name: 'userId', type: 'relation', required: true, collectionId: usersColId, maxSelect: 1, cascadeDelete: true },
      { name: 'pushSubscription', type: 'text', required: true },
      { name: 'userAgent', type: 'text', required: false },
      { name: 'lastActiveAt', type: 'date', required: false },
    ], openRules)

    // ---- REACTIONS ----
    await ensureCollection('reactions', 'base', [
      ...autodateFields,
      { name: 'messageId', type: 'relation', required: true, collectionId: messagesColId, maxSelect: 1, cascadeDelete: true },
      { name: 'userId', type: 'relation', required: true, collectionId: usersColId, maxSelect: 1, cascadeDelete: true },
      { name: 'emoji', type: 'text', required: true },
    ], openRules)

    console.log('\n✅ Database initialization complete!')
  } catch (err) {
    console.error('Fatal error:', err)
  }
}

initDB()
