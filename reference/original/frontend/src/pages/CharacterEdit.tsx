import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Grid,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material'
import characterService, { Character } from '../services/characterService'
import referenceService, {
  SkillReference,
  EdgeReference,
  HindranceReference,
  EquipmentReference,
  ArcanePowerReference,
  Skill,
  Edge,
  Hindrance,
  Equipment,
  ArcanePower,
} from '../services/referenceService'
import { calculateAllDerivedStats } from '../utils/derivedStats'

const ATTRIBUTE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12']
const SKILL_DIE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12']
const DEADLANDS_ARCHETYPES = [
  'Blessed',
  'Huckster',
  'Mad Scientist',
  'Shaman',
  'Chi Master',
  'Gunslinger',
  'Shootist',
  'Duelist',
  'Bounty Hunter',
  'Lawman',
  'Texas Ranger',
  'U.S. Marshal',
  'Pinkerton Agent',
  'Agency Agent',
  'Confederate Spy',
  'Union Soldier',
  'Confederate Soldier',
  'Cavalry Officer',
  'Outlaw',
  'Bandit',
  'Desperado',
  'Road Agent',
  'Gambler',
  'Card Sharp',
  'Con Artist',
  'Snake Oil Salesman',
  'Doctor',
  'Sawbones',
  'Dentist',
  'Undertaker',
  'Prospector',
  'Miner',
  'Sodbuster',
  'Rancher',
  'Cowpoke',
  'Wrangler',
  'Scout',
  'Explorer',
  'Mountain Man',
  'Trapper',
  'Guide',
  'Drifter',
  'Wanderer',
  'Vagrant',
  'Saloon Girl',
  'Entertainer',
  'Musician',
  'Newspaper Reporter',
  'Editor',
  'Photographer',
  'Shopkeeper',
  'Blacksmith',
  'Livery Operator',
  'Stable Hand',
  'Bartender',
  'Brothel Owner',
  'Preacher',
  'Minister',
  'Priest',
  'Nun',
  'Missionary',
  'Indian Warrior',
  'Indian Scout',
  'Tribal Elder',
  'Medicine Man',
  'Railroad Worker',
  'Telegraph Operator',
  'Stage Coach Driver',
  'Freight Hauler',
  'Riverboat Captain',
  'Riverboat Gambler',
  'Circus Performer',
  'Snake Charmer',
  'Fortune Teller',
  'Vigilante',
  'Town Drunk',
  'Homesteader',
  'School Teacher',
  'Other',
]

const CharacterEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<Character>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Fetch character data
  const {
    data: character,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['character', id],
    queryFn: () => characterService.getById(Number(id)),
    enabled: !!id,
  })

  // Fetch reference data
  const { data: skillReferences = [] } = useQuery({
    queryKey: ['skillReferences'],
    queryFn: referenceService.getSkills,
  })

  const { data: edgeReferences = [] } = useQuery({
    queryKey: ['edgeReferences'],
    queryFn: referenceService.getEdges,
  })

  const { data: hindranceReferences = [] } = useQuery({
    queryKey: ['hindranceReferences'],
    queryFn: referenceService.getHindrances,
  })

  const { data: equipmentReferences = [] } = useQuery({
    queryKey: ['equipmentReferences'],
    queryFn: referenceService.getEquipment,
  })

  const { data: arcanePowerReferences = [] } = useQuery({
    queryKey: ['arcanePowerReferences'],
    queryFn: referenceService.getArcanePowers,
  })

  // Initialize form data when character loads
  useEffect(() => {
    if (character) {
      setFormData(character)
    }
  }, [character])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () => characterService.update(Number(id), formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', id] })
      queryClient.invalidateQueries({ queryKey: ['characters'] })
      setHasUnsavedChanges(false)
      setErrors(['Character updated successfully!'])
      setTimeout(() => setErrors([]), 3000)
    },
    onError: (error) => {
      setErrors([`Failed to update character: ${error}`])
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => characterService.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] })
      navigate('/dashboard')
    },
    onError: (error) => {
      setErrors([`Failed to delete character: ${error}`])
      setShowDeleteDialog(false)
    },
  })

  const handleFormChange = (updates: Partial<Character>) => {
    setFormData({ ...formData, ...updates })
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    if (!formData.name?.trim()) {
      setErrors(['Character name is required'])
      return
    }
    if (!formData.occupation?.trim()) {
      setErrors(['Occupation is required'])
      return
    }

    // Calculate derived stats before saving
    const derivedStats = calculateAllDerivedStats(formData)
    const characterToSave = {
      ...formData,
      ...derivedStats,
    }
    setFormData(characterToSave)
    updateMutation.mutate()
  }

  const handleDelete = () => {
    if (deleteConfirmText === character?.name) {
      deleteMutation.mutate()
    } else {
      setErrors(['Please type the character name correctly to confirm deletion'])
    }
  }

  // Skills management
  const addSkill = (skillRef: SkillReference) => {
    // Check if skill already exists
    const existingSkill = formData.skills?.find(s => s.skillReferenceId === skillRef.id)
    if (existingSkill) {
      setErrors([`${skillRef.name} is already added to this character`])
      return
    }

    const newSkill: Skill = {
      name: skillRef.name,
      dieValue: skillRef.defaultValue || 'd4',
      skillReferenceId: skillRef.id,
    }
    handleFormChange({
      skills: [...(formData.skills || []), newSkill],
    })
  }

  const removeSkill = (index: number) => {
    const updated = [...(formData.skills || [])]
    updated.splice(index, 1)
    handleFormChange({ skills: updated })
  }

  const updateSkillDie = (index: number, dieValue: string) => {
    const updated = [...(formData.skills || [])]
    updated[index] = { ...updated[index], dieValue }
    handleFormChange({ skills: updated })
  }

  // Edges management
  const addEdge = (edgeRef: EdgeReference) => {
    const newEdge: Edge = {
      name: edgeRef.name,
      type: edgeRef.type,
      description: edgeRef.description,
      edgeReferenceId: edgeRef.id,
    }
    handleFormChange({
      edges: [...(formData.edges || []), newEdge],
    })
  }

  const removeEdge = (index: number) => {
    const updated = [...(formData.edges || [])]
    updated.splice(index, 1)
    handleFormChange({ edges: updated })
  }

  // Hindrances management
  const addHindrance = (hindranceRef: HindranceReference) => {
    const newHindrance: Hindrance = {
      name: hindranceRef.name,
      severity: hindranceRef.severity,
      description: hindranceRef.description,
      hindranceReferenceId: hindranceRef.id,
    }
    handleFormChange({
      hindrances: [...(formData.hindrances || []), newHindrance],
    })
  }

  const removeHindrance = (index: number) => {
    const updated = [...(formData.hindrances || [])]
    updated.splice(index, 1)
    handleFormChange({ hindrances: updated })
  }

  // Equipment management
  const addEquipment = (equipRef: EquipmentReference) => {
    const newEquip: Equipment = {
      name: equipRef.name,
      type: equipRef.type,
      quantity: 1,
      isEquipped: false,
      equipmentReferenceId: equipRef.id,
      description: equipRef.description,
    }
    handleFormChange({
      equipment: [...(formData.equipment || []), newEquip],
    })
  }

  const removeEquipment = (index: number) => {
    const updated = [...(formData.equipment || [])]
    updated.splice(index, 1)
    handleFormChange({ equipment: updated })
  }

  const updateEquipmentQuantity = (index: number, quantity: number) => {
    const updated = [...(formData.equipment || [])]
    updated[index] = { ...updated[index], quantity }
    handleFormChange({ equipment: updated })
  }

  const toggleEquipped = (index: number) => {
    const updated = [...(formData.equipment || [])]
    updated[index] = { ...updated[index], isEquipped: !updated[index].isEquipped }
    handleFormChange({ equipment: updated })
  }

  // Arcane Powers management
  const addArcanePower = (powerRef: ArcanePowerReference) => {
    const newPower: ArcanePower = {
      name: powerRef.name,
      powerPoints: powerRef.powerPoints,
      arcanePowerReferenceId: powerRef.id,
      description: powerRef.description,
    }
    handleFormChange({
      arcanePowers: [...(formData.arcanePowers || []), newPower],
    })
  }

  const removeArcanePower = (index: number) => {
    const updated = [...(formData.arcanePowers || [])]
    updated.splice(index, 1)
    handleFormChange({ arcanePowers: updated })
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (fetchError || !character) {
    return (
      <Box>
        <Alert severity="error">Failed to load character. Please try again.</Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    )
  }

  const skillsByAttribute = skillReferences.reduce((acc, skill) => {
    if (!acc[skill.attribute]) acc[skill.attribute] = []
    acc[skill.attribute].push(skill)
    return acc
  }, {} as Record<string, SkillReference[]>)
  // Sort skills alphabetically within each attribute group
  Object.keys(skillsByAttribute).forEach(attr => {
    skillsByAttribute[attr].sort((a, b) => a.name.localeCompare(b.name))
  })

  const edgesByType = edgeReferences.reduce((acc, edge) => {
    if (!acc[edge.type]) acc[edge.type] = []
    acc[edge.type].push(edge)
    return acc
  }, {} as Record<string, EdgeReference[]>)
  // Sort edges alphabetically within each type group
  Object.keys(edgesByType).forEach(type => {
    edgesByType[type].sort((a, b) => a.name.localeCompare(b.name))
  })

  const hindrancesBySeverity = hindranceReferences.reduce((acc, hindrance) => {
    if (!acc[hindrance.severity]) acc[hindrance.severity] = []
    acc[hindrance.severity].push(hindrance)
    return acc
  }, {} as Record<string, HindranceReference[]>)
  // Sort hindrances alphabetically within each severity group
  Object.keys(hindrancesBySeverity).forEach(severity => {
    hindrancesBySeverity[severity].sort((a, b) => a.name.localeCompare(b.name))
  })

  const equipmentByType = equipmentReferences.reduce((acc, equip) => {
    if (!acc[equip.type]) acc[equip.type] = []
    acc[equip.type].push(equip)
    return acc
  }, {} as Record<string, EquipmentReference[]>)
  // Sort equipment alphabetically within each type group
  Object.keys(equipmentByType).forEach(type => {
    equipmentByType[type].sort((a, b) => a.name.localeCompare(b.name))
  })

  return (
    <Box>
      {/* Back Button Header */}
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/character/${id}`)}
          aria-label="Go back"
        >
          Back to Character
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Box>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setShowDeleteDialog(true)}
            sx={{ mr: 2 }}
            disabled={deleteMutation.isPending}
          >
            Delete Character
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/character/${id}`)}
            sx={{ mr: 2 }}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {hasUnsavedChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Don't forget to save!
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert severity={errors[0].includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {/* Basic Info Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Basic Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Character Name"
                  value={formData.name || ''}
                  onChange={(e) => handleFormChange({ name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Occupation</InputLabel>
                  <Select
                    value={formData.occupation || ''}
                    onChange={(e) => handleFormChange({ occupation: e.target.value })}
                    label="Occupation"
                  >
                    {DEADLANDS_ARCHETYPES.map((archetype) => (
                      <MenuItem key={archetype} value={archetype}>
                        {archetype}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isNpc || false}
                      onChange={(e) => handleFormChange({ isNpc: e.target.checked })}
                    />
                  }
                  label="Non-Player Character (NPC)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Portrait Image URL"
                  value={formData.characterImageUrl || ''}
                  onChange={(e) => handleFormChange({ characterImageUrl: e.target.value })}
                  placeholder="https://example.com/portrait.jpg"
                  helperText="Enter a URL to an image for the character portrait"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange({ notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Attributes Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Attributes (Savage Worlds)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Agility</InputLabel>
                  <Select
                    value={formData.agilityDie || 'd6'}
                    onChange={(e) => handleFormChange({ agilityDie: e.target.value })}
                    label="Agility"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Smarts</InputLabel>
                  <Select
                    value={formData.smartsDie || 'd6'}
                    onChange={(e) => handleFormChange({ smartsDie: e.target.value })}
                    label="Smarts"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Spirit</InputLabel>
                  <Select
                    value={formData.spiritDie || 'd6'}
                    onChange={(e) => handleFormChange({ spiritDie: e.target.value })}
                    label="Spirit"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Strength</InputLabel>
                  <Select
                    value={formData.strengthDie || 'd6'}
                    onChange={(e) => handleFormChange({ strengthDie: e.target.value })}
                    label="Strength"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Vigor</InputLabel>
                  <Select
                    value={formData.vigorDie || 'd6'}
                    onChange={(e) => handleFormChange({ vigorDie: e.target.value })}
                    label="Vigor"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Skills Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Skills ({formData.skills?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Browse Skills by Attribute
              </Typography>
              {Object.entries(skillsByAttribute).map(([attribute, skills]) => (
                <Accordion key={attribute}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {attribute} ({skills.length} skills)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={1}>
                      {skills.map((skill) => (
                        <Grid item key={skill.id}>
                          <Chip
                            label={skill.name}
                            onClick={() => addSkill(skill)}
                            icon={<AddIcon />}
                            color={skill.isCoreSkill ? 'primary' : 'default'}
                            variant={skill.isCoreSkill ? 'filled' : 'outlined'}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>

            {formData.skills && formData.skills.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Skills
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Skill</TableCell>
                      <TableCell>Die Value</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...(formData.skills || [])].sort((a, b) => a.name.localeCompare(b.name)).map((skill) => {
                      const originalIndex = formData.skills!.findIndex(s => s.skillReferenceId === skill.skillReferenceId)
                      return (
                        <TableRow key={skill.skillReferenceId}>
                          <TableCell>{skill.name}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <Select
                                value={skill.dieValue}
                                onChange={(e) => updateSkillDie(originalIndex, e.target.value)}
                              >
                                {SKILL_DIE_OPTIONS.map((opt) => (
                                  <MenuItem key={opt} value={opt}>
                                    {opt}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => removeSkill(originalIndex)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Edges Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Edges ({formData.edges?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Browse Edges by Type
              </Typography>
              {Object.entries(edgesByType).map(([type, edges]) => (
                <Accordion key={type}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {type} ({edges.length} edges)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {edges.map((edge) => (
                        <Grid item xs={12} key={edge.id}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => addEdge(edge)}
                            >
                              {edge.name}
                            </Button>
                            <Tooltip title={edge.description}>
                              <IconButton size="small">
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>

            {formData.edges && formData.edges.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Edges
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Edge</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...(formData.edges || [])].sort((a, b) => a.name.localeCompare(b.name)).map((edge) => {
                      const originalIndex = formData.edges!.findIndex(e => e.edgeReferenceId === edge.edgeReferenceId && e.name === edge.name)
                      return (
                        <TableRow key={`${edge.edgeReferenceId}-${originalIndex}`}>
                          <TableCell>{edge.name}</TableCell>
                          <TableCell>{edge.type}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => removeEdge(originalIndex)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Hindrances Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Hindrances ({formData.hindrances?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Browse Hindrances by Severity
              </Typography>
              {Object.entries(hindrancesBySeverity).map(([severity, hindrances]) => (
                <Accordion key={severity}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {severity} ({hindrances.length} hindrances)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {hindrances.map((hindrance) => (
                        <Grid item xs={12} key={hindrance.id}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => addHindrance(hindrance)}
                            >
                              {hindrance.name}
                            </Button>
                            <Tooltip title={hindrance.description}>
                              <IconButton size="small">
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>

            {formData.hindrances && formData.hindrances.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Hindrances
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hindrance</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...(formData.hindrances || [])].sort((a, b) => a.name.localeCompare(b.name)).map((hindrance) => {
                      const originalIndex = formData.hindrances!.findIndex(h => h.hindranceReferenceId === hindrance.hindranceReferenceId && h.name === hindrance.name)
                      return (
                        <TableRow key={`${hindrance.hindranceReferenceId}-${originalIndex}`}>
                          <TableCell>{hindrance.name}</TableCell>
                          <TableCell>{hindrance.severity}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => removeHindrance(originalIndex)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Equipment Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Equipment ({formData.equipment?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Browse Equipment by Type
              </Typography>
              {Object.entries(equipmentByType).map(([type, items]) => (
                <Accordion key={type}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {type.replace('_', ' ')} ({items.length} items)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {items.map((item) => (
                        <Grid item xs={12} sm={6} key={item.id}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => addEquipment(item)}
                            >
                              {item.name}
                            </Button>
                            <Tooltip
                              title={`${item.description}${item.cost ? ` - $${item.cost}` : ''}`}
                            >
                              <IconButton size="small">
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>

            {formData.equipment && formData.equipment.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Equipment
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Equipped</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.equipment.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.type.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) =>
                              updateEquipmentQuantity(index, parseInt(e.target.value) || 1)
                            }
                            sx={{ width: 80 }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.isEquipped}
                            onChange={() => toggleEquipped(index)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removeEquipment(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Arcane Powers Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Arcane Powers ({formData.arcanePowers?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Available Powers
              </Typography>
              <Grid container spacing={2}>
                {arcanePowerReferences.map((power) => (
                  <Grid item xs={12} sm={6} key={power.id}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => addArcanePower(power)}
                      >
                        {power.name}
                      </Button>
                      <Tooltip
                        title={`${power.description} | PP: ${power.powerPoints} | Range: ${power.range}`}
                      >
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {formData.arcanePowers && formData.arcanePowers.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Current Powers
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Power</TableCell>
                      <TableCell>Power Points</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.arcanePowers.map((power, index) => (
                      <TableRow key={index}>
                        <TableCell>{power.name}</TableCell>
                        <TableCell>{power.powerPoints}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removeArcanePower(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Derived Stats Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Derived Stats & XP</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pace"
                  value={formData.pace || 6}
                  onChange={(e) => handleFormChange({ pace: parseInt(e.target.value) || 6 })}
                  helperText="Movement rate (default: 6)"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Size"
                  value={formData.size || 0}
                  onChange={(e) => handleFormChange({ size: parseInt(e.target.value) || 0 })}
                  helperText="Size modifier (default: 0)"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Grit"
                  value={formData.grit || 1}
                  onChange={(e) => handleFormChange({ grit: parseInt(e.target.value) || 1 })}
                  helperText="Grit level (default: 1)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total XP"
                  value={formData.totalXp || 0}
                  onChange={(e) => handleFormChange({ totalXp: parseInt(e.target.value) || 0 })}
                  helperText="Total experience points earned"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Spent XP"
                  value={formData.spentXp || 0}
                  onChange={(e) => handleFormChange({ spentXp: parseInt(e.target.value) || 0 })}
                  helperText="Experience points spent on improvements"
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Unspent XP: {(formData.totalXp || 0) - (formData.spentXp || 0)}
                </Alert>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => !deleteMutation.isPending && setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Character</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{character.name}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete:
            <ul>
              <li>{formData.skills?.length || 0} skills</li>
              <li>{formData.edges?.length || 0} edges</li>
              <li>{formData.hindrances?.length || 0} hindrances</li>
              <li>{formData.equipment?.length || 0} equipment items</li>
              <li>{formData.arcanePowers?.length || 0} arcane powers</li>
            </ul>
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            Type the character name <strong>{character.name}</strong> to confirm:
          </DialogContentText>
          <TextField
            fullWidth
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={character.name}
            error={deleteConfirmText !== '' && deleteConfirmText !== character.name}
            helperText={
              deleteConfirmText !== '' && deleteConfirmText !== character.name
                ? 'Name does not match'
                : ''
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteConfirmText !== character.name || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CharacterEdit
