// Unified service that handles both craving and energy support flows
import { CravingService } from './craving-service'
import { EnergyService } from './energy-service'
import { 
  Message, 
  ConversationStep, 
  Intervention, 
  Coach, 
  Client 
} from './craving-types'
import { type Option } from './craving-conversation'

export type SupportType = 'craving' | 'energy' | null

export interface ProcessInputParams {
  input: string
  currentStep: ConversationStep
  clientName: string
  chosenIntervention?: Intervention
  interventions?: Intervention[]
  isOption: boolean
  supportType?: SupportType
  onMessage: (message: Message) => Promise<void>
  onStateUpdate: (state: {
    currentStep: ConversationStep
    optionChoices: Array<Option | string>
    interventions?: Intervention[]
    chosenIntervention?: Intervention | null
  }) => void
}

export class UnifiedService {
  private cravingService: CravingService | null = null
  private energyService: EnergyService | null = null
  private supportType: SupportType = null
  private incidentId: string | null = null

  constructor() {
    // Services will be initialized when support type is determined
  }

  // Initialize the appropriate service based on support type
  private async initializeService(supportType: SupportType): Promise<boolean> {
    if (this.supportType === supportType) {
      return true // Already initialized
    }

    this.supportType = supportType

    try {
      if (supportType === 'craving') {
        if (!this.cravingService) {
          this.cravingService = new CravingService()
        }
        const initialized = await this.cravingService.initialize()
        // Note: clientId is managed internally by the services
        return initialized
      } else if (supportType === 'energy') {
        if (!this.energyService) {
          this.energyService = new EnergyService()
        }
        const initialized = await this.energyService.initialize()
        // Note: clientId is managed internally by the services
        return initialized
      }
    } catch (error) {
      console.error(`❌ Failed to initialize ${supportType} service:`, error)
    }

    return false
  }

  // Get session information (client and coach data)
  async getSessionInfo(): Promise<{ client: Client | null; coach: Coach | null }> {
    // Try to get info from either service that's available
    if (this.cravingService) {
      return await this.cravingService.getSessionInfo()
    } else if (this.energyService) {
      return await this.energyService.getSessionInfo()
    }

    // If no services initialized, try to create a craving service temporarily
    // This allows us to get session info before support type is selected
    try {
      const tempService = new CravingService()
      await tempService.initialize()
      return await tempService.getSessionInfo()
    } catch (error) {
      console.error('❌ Failed to get session info:', error)
      return { client: null, coach: null }
    }
  }

  // Create incident based on support type
  async createIncident(supportType: SupportType): Promise<string | null> {
    const initialized = await this.initializeService(supportType)
    if (!initialized) {
      throw new Error(`Failed to initialize ${supportType} service`)
    }

    try {
      if (supportType === 'craving' && this.cravingService) {
        this.incidentId = await this.cravingService.createCravingIncident()
      } else if (supportType === 'energy' && this.energyService) {
        this.incidentId = await this.energyService.createMovementIncident()
      }

      return this.incidentId
    } catch (error) {
      console.error(`❌ Failed to create ${supportType} incident:`, error)
      return null
    }
  }

  // Save message to database
  async saveMessage(message: Message): Promise<void> {
    const activeService = this.getActiveService()
    if (!activeService) {
      // For initial messages before support type is selected, just log and continue
      console.log('💬 Message queued (no service initialized yet):', message.text)
      return
    }

    await activeService.saveMessage(message)
  }

  // Process user input and generate response
  async processUserInput(params: ProcessInputParams): Promise<void> {
    const { currentStep, supportType } = params

    // Handle struggle identification step
    if (currentStep === ConversationStep.IDENTIFY_STRUGGLE) {
      await this.handleStruggleIdentification(params)
      return
    }

    // For other steps, delegate to appropriate service
    if (!supportType || !this.getActiveService()) {
      throw new Error('Support type must be determined before processing input')
    }

    const activeService = this.getActiveService()!
    await activeService.processUserInput(params)
  }

  // Handle the struggle identification step
  private async handleStruggleIdentification(params: ProcessInputParams): Promise<void> {
    const { input, onMessage, onStateUpdate } = params
    
    // Determine support type from input
    let selectedType: SupportType = null
    if (input.toLowerCase().includes('craving') || input === 'craving') {
      selectedType = 'craving'
    } else if (input.toLowerCase().includes('energy') || input === 'energy') {
      selectedType = 'energy'
    }

    if (!selectedType) {
      throw new Error('Unable to determine support type from input')
    }

    // Initialize the appropriate service and create incident
    const initialized = await this.initializeService(selectedType)
    if (!initialized) {
      throw new Error(`Failed to initialize ${selectedType} service`)
    }

    const incidentId = await this.createIncident(selectedType)
    if (!incidentId) {
      throw new Error(`Failed to create ${selectedType} incident`)
    }

    // Add user's selection message
    const now = new Date()
    const userMessage: Message = {
      id: `user-${now.getTime()}`,
      sender: 'client',
      text: input,
      type: 'option_selection',
      timestamp: now,
    }
    await onMessage(userMessage)

    // Get the appropriate first response from the selected service and send it
    if (selectedType === 'craving') {
      // Get food selection message from craving service
      const response = await this.cravingService!.getFoodSelectionMessage(params.clientName || 'there')
      
      // Send the response message
      await onMessage(response.response)
      
      // Update state with craving-specific options
      onStateUpdate({
        currentStep: response.nextStep,
        optionChoices: response.options || [],
        interventions: params.interventions,
        chosenIntervention: params.chosenIntervention
      })
    } else {
      // Get blocker identification message from energy service
      const response = await this.energyService!.getBlockerIdentificationMessage(params.clientName || 'there')
      
      // Send the response message
      await onMessage(response.response)
      
      // Update state with energy-specific options
      onStateUpdate({
        currentStep: response.nextStep,
        optionChoices: response.options || [],
        interventions: params.interventions,
        chosenIntervention: params.chosenIntervention
      })
    }
  }

  // Get the currently active service
  private getActiveService(): CravingService | EnergyService | null {
    if (this.supportType === 'craving' && this.cravingService) {
      return this.cravingService
    } else if (this.supportType === 'energy' && this.energyService) {
      return this.energyService
    }
    return null
  }

  // Get current support type
  getSupportType(): SupportType {
    return this.supportType
  }

  // Get client ID from active service
  getClientId(): string | null {
    const activeService = this.getActiveService()
    if (!activeService) return null
    
    // Access the private clientId property via any type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (activeService as any).clientId || null
  }

  // Get incident ID
  getIncidentId(): string | null {
    return this.incidentId
  }

  // Helper method to get initial struggle identification message
  getStruggleIdentificationMessage(clientName: string = 'there'): {
    response: Message
    nextStep: ConversationStep
    options: Array<{ emoji: string; name: string; value: string }>
  } {
    const now = new Date()
    
    return {
      response: {
        id: `coach-${now.getTime()}`,
        sender: 'coach',
        text: `Hi ${clientName}! I'm here to help you get the support you need. What are you struggling with right now?`,
        type: 'option_selection',
        timestamp: now,
      },
      nextStep: ConversationStep.IDENTIFY_STRUGGLE,
      options: [
        { emoji: '🍰', name: 'I\'m having a craving', value: 'craving' },
        { emoji: '⚡', name: 'I need an energy boost', value: 'energy' }
      ]
    }
  }
}