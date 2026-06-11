import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Sync as SyncIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  ArrowBack as BackIcon,
  DataObject as SeedIcon,
} from '@mui/icons-material'
import { getCkmStatus, listCkmTree, readCkmFile, seedCkmDemo, syncCkmMirror } from '../api/ckmClient.ts'

type Scope = 'local' | 'remote'

export default function CkmPage() {
  const [scope, setScope] = useState<Scope>('remote')
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getCkmStatus>> | null>(null)
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listCkmTree>>['entries']>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [loadingTree, setLoadingTree] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadStatus = async () => {
    const s = await getCkmStatus()
    setStatus(s)
  }

  const loadTree = async (nextPath: string) => {
    setLoadingTree(true)
    setError(null)
    try {
      const res = await listCkmTree(scope, nextPath)
      setPath(res.path)
      setEntries(res.entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CKM tree')
    } finally {
      setLoadingTree(false)
    }
  }

  const loadFile = async (filePath: string) => {
    setLoadingFile(true)
    setError(null)
    try {
      const res = await readCkmFile(scope, filePath)
      setSelectedFile(res.path)
      setFileContent(res.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CKM file')
    } finally {
      setLoadingFile(false)
    }
  }

  const onSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncCkmMirror()
      await loadStatus()
      await loadTree(path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync CKM mirror')
    } finally {
      setSyncing(false)
    }
  }

  const onSeedDemo = async () => {
    setSeeding(true)
    setError(null)
    try {
      const result = await seedCkmDemo()
      await loadStatus()
      await loadTree(path)
      setSelectedFile('')
      setFileContent(`✅ ${result.message}\nFiles written: ${result.filesWritten}\nRoot: ${result.rootPath}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed CKM demo data')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    loadStatus().catch(() => {})
  }, [])

  useEffect(() => {
    setSelectedFile('')
    setFileContent('')
    loadTree('').catch(() => {})
  }, [scope])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => e.name.toLowerCase().includes(q))
  }, [entries, search])

  const goUp = () => {
    if (!path) return
    const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    loadTree(parent).catch(() => {})
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>CKM Mirror Explorer</Typography>
          <Typography variant="body2" color="text.secondary">
            Browse openEHR CKM assets from the integrated mirror repository (`local/` and `remote/`) inside BunEHR.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={seeding ? <CircularProgress color="inherit" size={16} /> : <SeedIcon />}
            disabled={seeding}
            onClick={onSeedDemo}
          >
            {seeding ? 'Seeding…' : 'Seed Demo CKM'}
          </Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress color="inherit" size={16} /> : <SyncIcon />}
            disabled={syncing}
            onClick={onSync}
          >
            {syncing ? 'Syncing…' : 'Sync Mirror'}
          </Button>
        </Stack>
      </Box>

      {status && (
        <Alert severity={status.hasRepo ? 'success' : 'warning'} sx={{ mb: 2 }}>
          Repo: <strong>{status.repository}</strong> · Branch: <strong>{status.branch}</strong> · Last commit: <strong>{status.lastCommit}</strong>
          {status.error ? ` · ${status.error}` : ''}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Select size="small" value={scope} onChange={e => setScope(e.target.value as Scope)}>
                  <MenuItem value="remote">remote</MenuItem>
                  <MenuItem value="local">local</MenuItem>
                </Select>
                <Button size="small" variant="outlined" onClick={goUp} disabled={!path} startIcon={<BackIcon />}>
                  Up
                </Button>
              </Stack>
              <TextField
                size="small"
                fullWidth
                placeholder="Filter files…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Chip size="small" label={`Path: /${path || '(root)'}`} sx={{ mb: 1.5 }} />
              <Divider sx={{ mb: 1 }} />
              {loadingTree ? <CircularProgress size={20} /> : (
                <List dense sx={{ maxHeight: 520, overflow: 'auto' }}>
                  {filteredEntries.map(entry => (
                    <ListItemButton
                      key={entry.path}
                      onClick={() => entry.isDirectory ? loadTree(entry.path) : loadFile(entry.path)}
                      selected={!entry.isDirectory && selectedFile === entry.path}
                    >
                      {entry.isDirectory ? <FolderIcon fontSize="small" sx={{ mr: 1 }} /> : <FileIcon fontSize="small" sx={{ mr: 1 }} />}
                      <ListItemText
                        primary={entry.name}
                        secondary={entry.isDirectory ? 'directory' : `${Math.round(entry.size / 1024)} KB`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedFile ? selectedFile : 'Select a file'}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              {loadingFile ? <CircularProgress size={20} /> : (
                <TextField
                  fullWidth
                  multiline
                  minRows={24}
                  value={fileContent}
                  InputProps={{ readOnly: true }}
                  sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
