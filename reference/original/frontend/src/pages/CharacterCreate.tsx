import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
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
  Autocomplete,
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
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
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
const steps = [
  'Basic Info',
  'Attributes',
  'Skills',
  'Edges',
  'Hindrances',
  'Equipment',
  'Arcane Powers',
  'Derived Stats',
  'Review',
]

const CharacterCreate = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeStep, setActiveStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [showXpDialog, setShowXpDialog] = useState(true)
  const [xpInput, setXpInput] = useState<string>('0')

  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    occupation: '',
    isNpc: false,
    agilityDie: 'd6',
    smartsDie: 'd6',
    spiritDie: 'd6',
    strengthDie: 'd6',
    vigorDie: 'd6',
    pace: 6,
    size: 0,
    wind: 0,
    grit: 1,
    parry: 2,
    toughness: 2,
    charisma: 0,
    totalXp: 0,
    spentXp: 0,
    skills: [],
    edges: [],
    hindrances: [],
    equipment: [],
    arcanePowers: [],
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

  const createCharacterMutation = useMutation({
    mutationFn: characterService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['characters'] })
      navigate(`/character/${data.id}`)
    },
    onError: (error) => {
      setErrors([`Failed to create character: ${error}`])
    },
  })

  const handleNext = () => {
    const validationErrors = validateCurrentStep()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setErrors([])
    setActiveStep((prevStep) => prevStep - 1)
  }

  const validateCurrentStep = (): string[] => {
    const errors: string[] = []

    if (activeStep === 0) {
      if (!formData.name?.trim()) errors.push('Character name is required')
      if (!formData.occupation?.trim()) errors.push('Occupation is required')
    }

    // Attribute validation - only enforce 5 point limit for 0 XP characters
    if (activeStep === 1 && (formData.totalXp || 0) === 0) {
      const attributePoints: Record<string, number> = {
        'd4': 0,
        'd6': 1,
        'd8': 2,
        'd10': 3,
        'd12': 4,
      }

      const totalPoints =
        attributePoints[formData.agilityDie || 'd4'] +
        attributePoints[formData.smartsDie || 'd4'] +
        attributePoints[formData.spiritDie || 'd4'] +
        attributePoints[formData.strengthDie || 'd4'] +
        attributePoints[formData.vigorDie || 'd4']

      const maxPoints = 5
      if (totalPoints > maxPoints) {
        errors.push(`Too many attribute points used (${totalPoints}/${maxPoints})`)
      }
      if (totalPoints < maxPoints) {
        errors.push(`Not all attribute points used (${totalPoints}/${maxPoints})`)
      }
    }

    return errors
  }

  const calculateXpSpent = (): number => {
    let xpSpent = 0

    // Calculate attribute costs (each die step above d4 costs XP)
    const attributeCost: Record<string, number> = {
      'd4': 0,
      'd6': 1,
      'd8': 2,
      'd10': 3,
      'd12': 4,
    }

    xpSpent += attributeCost[formData.agilityDie || 'd4']
    xpSpent += attributeCost[formData.smartsDie || 'd4']
    xpSpent += attributeCost[formData.spiritDie || 'd4']
    xpSpent += attributeCost[formData.strengthDie || 'd4']
    xpSpent += attributeCost[formData.vigorDie || 'd4']

    // Skills cost (each die step costs XP)
    formData.skills?.forEach((skill) => {
      xpSpent += attributeCost[skill.dieValue || 'd4']
    })

    // Edges typically cost 2 XP each (simplified - could vary by edge type)
    xpSpent += (formData.edges?.length || 0) * 2

    // Hindrances give bonus XP (negative cost)
    formData.hindrances?.forEach((hindrance) => {
      if (hindrance.severity === 'MAJOR') {
        xpSpent -= 2
      } else if (hindrance.severity === 'MINOR') {
        xpSpent -= 1
      }
    })

    return xpSpent
  }

  const handleSubmit = () => {
    // Calculate derived stats and XP spent before submission
    const derivedStats = calculateAllDerivedStats(formData)
    const xpSpent = calculateXpSpent()
    const characterToSubmit = {
      ...formData,
      ...derivedStats,
      spentXp: xpSpent,
    }
    createCharacterMutation.mutate(characterToSubmit as Character)
  }

  // Skills management
  const addSkill = (skillRef: SkillReference) => {
    // Check if skill already exists
    const existingSkill = formData.skills?.find(s => s.skillReferenceId === skillRef.id)
    if (existingSkill) {
      return // Silently ignore duplicate - already in character
    }

    const newSkill: Skill = {
      name: skillRef.name,
      dieValue: skillRef.defaultValue || 'd4',
      skillReferenceId: skillRef.id,
    }
    setFormData({
      ...formData,
      skills: [...(formData.skills || []), newSkill],
    })
  }

  const removeSkill = (index: number) => {
    const updated = [...(formData.skills || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, skills: updated })
  }

  const updateSkillDie = (index: number, dieValue: string) => {
    const updated = [...(formData.skills || [])]
    updated[index] = { ...updated[index], dieValue }
    setFormData({ ...formData, skills: updated })
  }

  // Edges management
  const addEdge = (edgeRef: EdgeReference) => {
    // Check if edge already exists
    const existingEdge = formData.edges?.find(e => e.edgeReferenceId === edgeRef.id)
    if (existingEdge) {
      return // Silently ignore duplicate - already in character
    }

    const newEdge: Edge = {
      name: edgeRef.name,
      type: edgeRef.type,
      description: edgeRef.description,
      edgeReferenceId: edgeRef.id,
    }
    setFormData({
      ...formData,
      edges: [...(formData.edges || []), newEdge],
    })
  }

  const removeEdge = (index: number) => {
    const updated = [...(formData.edges || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, edges: updated })
  }

  // Hindrances management
  const addHindrance = (hindranceRef: HindranceReference) => {
    // Check if hindrance already exists
    const existingHindrance = formData.hindrances?.find(h => h.hindranceReferenceId === hindranceRef.id)
    if (existingHindrance) {
      return // Silently ignore duplicate - already in character
    }

    const newHindrance: Hindrance = {
      name: hindranceRef.name,
      severity: hindranceRef.severity,
      description: hindranceRef.description,
      hindranceReferenceId: hindranceRef.id,
    }
    setFormData({
      ...formData,
      hindrances: [...(formData.hindrances || []), newHindrance],
    })
  }

  const removeHindrance = (index: number) => {
    const updated = [...(formData.hindrances || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, hindrances: updated })
  }

  // Equipment management
  const addEquipment = (equipRef: EquipmentReference) => {
    // Check if equipment already exists
    const existingEquip = formData.equipment?.find(e => e.equipmentReferenceId === equipRef.id)
    if (existingEquip) {
      return // Silently ignore duplicate - already in character
    }

    const newEquip: Equipment = {
      name: equipRef.name,
      type: equipRef.type,
      quantity: 1,
      isEquipped: false,
      equipmentReferenceId: equipRef.id,
      description: equipRef.description,
    }
    setFormData({
      ...formData,
      equipment: [...(formData.equipment || []), newEquip],
    })
  }

  const removeEquipment = (index: number) => {
    const updated = [...(formData.equipment || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, equipment: updated })
  }

  const updateEquipmentQuantity = (index: number, quantity: number) => {
    const updated = [...(formData.equipment || [])]
    updated[index] = { ...updated[index], quantity }
    setFormData({ ...formData, equipment: updated })
  }

  // Arcane Powers management
  const addArcanePower = (powerRef: ArcanePowerReference) => {
    const newPower: ArcanePower = {
      name: powerRef.name,
      powerPoints: powerRef.powerPoints,
      arcanePowerReferenceId: powerRef.id,
      description: powerRef.description,
    }
    setFormData({
      ...formData,
      arcanePowers: [...(formData.arcanePowers || []), newPower],
    })
  }

  const removeArcanePower = (index: number) => {
    const updated = [...(formData.arcanePowers || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, arcanePowers: updated })
  }

  const handleXpConfirm = () => {
    const xp = parseInt(xpInput) || 0
    setFormData({ ...formData, totalXp: xp })
    setShowXpDialog(false)
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Basic Info
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Character Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Occupation</InputLabel>
                  <Select
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
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
                      checked={formData.isNpc}
                      onChange={(e) => setFormData({ ...formData, isNpc: e.target.checked })}
                    />
                  }
                  label="Non-Player Character (NPC)"
                />
              </Grid>
            </Grid>
          </Box>
        )

      case 1: // Attributes
        const attributePoints: Record<string, number> = {
          'd4': 0,
          'd6': 1,
          'd8': 2,
          'd10': 3,
          'd12': 4,
        }

        const usedPoints =
          attributePoints[formData.agilityDie || 'd4'] +
          attributePoints[formData.smartsDie || 'd4'] +
          attributePoints[formData.spiritDie || 'd4'] +
          attributePoints[formData.strengthDie || 'd4'] +
          attributePoints[formData.vigorDie || 'd4']

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Attributes (Savage Worlds)
            </Typography>
            {(formData.totalXp || 0) === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Characters start with d4 in all attributes. You have <strong>5 points</strong> to
                distribute.
                <br />
                d6 costs 1 point, d8 costs 2 points, d10 costs 3 points, d12 costs 4 points.
                <br />
                <strong>Points used: {usedPoints}/5</strong>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                Characters start with d4 in all attributes. Each die step costs XP (see XP tracker above).
                <br />
                d6 costs 1 XP, d8 costs 2 XP, d10 costs 3 XP, d12 costs 4 XP.
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Agility</InputLabel>
                  <Select
                    value={formData.agilityDie}
                    onChange={(e) => setFormData({ ...formData, agilityDie: e.target.value })}
                    label="Agility"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt} ({attributePoints[opt]} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Smarts</InputLabel>
                  <Select
                    value={formData.smartsDie}
                    onChange={(e) => setFormData({ ...formData, smartsDie: e.target.value })}
                    label="Smarts"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt} ({attributePoints[opt]} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Spirit</InputLabel>
                  <Select
                    value={formData.spiritDie}
                    onChange={(e) => setFormData({ ...formData, spiritDie: e.target.value })}
                    label="Spirit"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt} ({attributePoints[opt]} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Strength</InputLabel>
                  <Select
                    value={formData.strengthDie}
                    onChange={(e) => setFormData({ ...formData, strengthDie: e.target.value })}
                    label="Strength"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt} ({attributePoints[opt]} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Vigor</InputLabel>
                  <Select
                    value={formData.vigorDie}
                    onChange={(e) => setFormData({ ...formData, vigorDie: e.target.value })}
                    label="Vigor"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt} ({attributePoints[opt]} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )

      case 2: // Skills
        const skillsByAttribute = skillReferences.reduce((acc, skill) => {
          if (!acc[skill.attribute]) acc[skill.attribute] = []
          acc[skill.attribute].push(skill)
          return acc
        }, {} as Record<string, SkillReference[]>)

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Skills
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Add skills to your character. You can adjust the die value for each skill.
              <br />
              Savage Worlds: Novice characters typically get 15 skill points (d4=1pt, d6=2pts,
              d8=3pts, d10=4pts, d12=5pts).
            </Alert>

            {/* Skills Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
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

            {/* Selected Skills */}
            {formData.skills && formData.skills.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Skills ({formData.skills.length})
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
                    {formData.skills.map((skill, index) => (
                      <TableRow key={index}>
                        <TableCell>{skill.name}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 80 }}>
                            <Select
                              value={skill.dieValue}
                              onChange={(e) => updateSkillDie(index, e.target.value)}
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
                          <IconButton size="small" onClick={() => removeSkill(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )

      case 3: // Edges
        const edgesByType = edgeReferences.reduce((acc, edge) => {
          if (!acc[edge.type]) acc[edge.type] = []
          acc[edge.type].push(edge)
          return acc
        }, {} as Record<string, EdgeReference[]>)

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Edges
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Select edges for your character. Savage Worlds characters typically start with 1-2
              edges.
              <br />
              Check requirements carefully - some edges require specific attributes or skills.
            </Alert>

            {/* Edges Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
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
                            <Typography variant="caption" sx={{ mt: 1 }}>
                              {edge.requirements && `Requires: ${edge.requirements}`}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>

            {/* Selected Edges */}
            {formData.edges && formData.edges.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Edges ({formData.edges.length})
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
                    {formData.edges.map((edge, index) => (
                      <TableRow key={index}>
                        <TableCell>{edge.name}</TableCell>
                        <TableCell>{edge.type}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removeEdge(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )

      case 4: // Hindrances
        const hindrancesBySeverity = hindranceReferences.reduce((acc, hindrance) => {
          if (!acc[hindrance.severity]) acc[hindrance.severity] = []
          acc[hindrance.severity].push(hindrance)
          return acc
        }, {} as Record<string, HindranceReference[]>)

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Hindrances
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Hindrances give extra points during character creation. Minor=1pt, Major=2pts.
              <br />
              You can take up to 1 Major and 2 Minor hindrances (max 4 points).
            </Alert>

            {/* Hindrances Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
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

            {/* Selected Hindrances */}
            {formData.hindrances && formData.hindrances.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Hindrances ({formData.hindrances.length})
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
                    {formData.hindrances.map((hindrance, index) => (
                      <TableRow key={index}>
                        <TableCell>{hindrance.name}</TableCell>
                        <TableCell>{hindrance.severity}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removeHindrance(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )

      case 5: // Equipment
        const equipmentByType = equipmentReferences.reduce((acc, equip) => {
          if (!acc[equip.type]) acc[equip.type] = []
          acc[equip.type].push(equip)
          return acc
        }, {} as Record<string, EquipmentReference[]>)

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Equipment
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Select starting equipment for your character. Savage Worlds characters start with
              $500.
            </Alert>

            {/* Equipment Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
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

            {/* Selected Equipment */}
            {formData.equipment && formData.equipment.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Equipment ({formData.equipment.length})
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quantity</TableCell>
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
          </Box>
        )

      case 6: // Arcane Powers
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Arcane Powers
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Select arcane powers if your character has an Arcane Background edge.
              <br />
              Characters with Arcane Background typically start with 3 powers and 10 Power Points.
            </Alert>

            {/* Powers Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
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

            {/* Selected Powers */}
            {formData.arcanePowers && formData.arcanePowers.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Powers ({formData.arcanePowers.length})
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
          </Box>
        )

      case 7: // Derived Stats
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Derived Stats
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pace"
                  value={formData.pace}
                  onChange={(e) => setFormData({ ...formData, pace: parseInt(e.target.value) })}
                  helperText="Movement rate (default: 6)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) })}
                  helperText="Character size modifier (default: 0)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Grit"
                  value={formData.grit}
                  onChange={(e) => setFormData({ ...formData, grit: parseInt(e.target.value) })}
                  helperText="Grit level (default: 1)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total XP"
                  value={formData.totalXp}
                  onChange={(e) => setFormData({ ...formData, totalXp: parseInt(e.target.value) })}
                  helperText="Total experience points earned"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Spent XP"
                  value={formData.spentXp}
                  onChange={(e) => setFormData({ ...formData, spentXp: parseInt(e.target.value) })}
                  helperText="Experience points already spent"
                />
              </Grid>
            </Grid>
          </Box>
        )

      case 8: // Review
        // Calculate derived stats for display
        const derivedStats = calculateAllDerivedStats(formData)

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Character
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">{formData.name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Occupation
                </Typography>
                <Typography variant="body1">{formData.occupation}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Character Type
                </Typography>
                <Typography variant="body1">
                  {formData.isNpc ? 'NPC' : 'Player Character'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Attributes
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    Agility: {formData.agilityDie}
                  </Grid>
                  <Grid item xs={4}>
                    Smarts: {formData.smartsDie}
                  </Grid>
                  <Grid item xs={4}>
                    Spirit: {formData.spiritDie}
                  </Grid>
                  <Grid item xs={4}>
                    Strength: {formData.strengthDie}
                  </Grid>
                  <Grid item xs={4}>
                    Vigor: {formData.vigorDie}
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Skills ({formData.skills?.length || 0})
                </Typography>
                <Typography variant="body2">
                  {formData.skills?.map((s) => `${s.name} (${s.dieValue})`).join(', ') ||
                    'None selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Edges ({formData.edges?.length || 0})
                </Typography>
                <Typography variant="body2">
                  {formData.edges?.map((e) => e.name).join(', ') || 'None selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Hindrances ({formData.hindrances?.length || 0})
                </Typography>
                <Typography variant="body2">
                  {formData.hindrances?.map((h) => `${h.name} (${h.severity})`).join(', ') ||
                    'None selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Equipment ({formData.equipment?.length || 0})
                </Typography>
                <Typography variant="body2">
                  {formData.equipment?.map((e) => `${e.name} (${e.quantity})`).join(', ') ||
                    'None selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Arcane Powers ({formData.arcanePowers?.length || 0})
                </Typography>
                <Typography variant="body2">
                  {formData.arcanePowers?.map((p) => p.name).join(', ') || 'None selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Derived Stats
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Pace
                    </Typography>
                    <Typography variant="body2">{formData.pace}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Parry
                    </Typography>
                    <Typography variant="body2">{derivedStats.parry}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Toughness
                    </Typography>
                    <Typography variant="body2">{derivedStats.toughness}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Charisma
                    </Typography>
                    <Typography variant="body2">
                      {derivedStats.charisma >= 0 ? `+${derivedStats.charisma}` : derivedStats.charisma}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Size
                    </Typography>
                    <Typography variant="body2">
                      {formData.size !== undefined && formData.size >= 0 ? `+${formData.size}` : formData.size}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Grit
                    </Typography>
                    <Typography variant="body2">{formData.grit}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total XP
                    </Typography>
                    <Typography variant="body2">{formData.totalXp || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Unspent XP
                    </Typography>
                    <Typography variant="body2">{(formData.totalXp || 0) - (formData.spentXp || 0)}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box>
      {/* XP Budget Dialog */}
      <Dialog open={showXpDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Set Character XP Budget</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            How much XP should this character have? This will set the budget for character
            creation. New characters typically start with 0 XP, while experienced characters may
            have more.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Total XP"
            value={xpInput}
            onChange={(e) => setXpInput(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            helperText="Enter the total XP this character should have"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/dashboard')}>Cancel</Button>
          <Button variant="contained" onClick={handleXpConfirm}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* XP Budget Display */}
      {!showXpDialog && (
        <Paper
          sx={{
            p: 2,
            mt: 2,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                XP Budget
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {formData.totalXp || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                XP Spent
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {calculateXpSpent()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                XP Remaining
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  color: (formData.totalXp || 0) - calculateXpSpent() < 0 ? '#ffcdd2' : 'white',
                }}
              >
                {(formData.totalXp || 0) - calculateXpSpent()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button onClick={() => navigate('/dashboard')} disabled={createCharacterMutation.isPending}>
            Cancel
          </Button>
          <Box>
            <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={createCharacterMutation.isPending}
              >
                {createCharacterMutation.isPending ? 'Saving...' : 'Save Character'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default CharacterCreate
