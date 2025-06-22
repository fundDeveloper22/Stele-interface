'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from '@tanstack/react-query'
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Settings, DollarSign, Shield, Users, FileText, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ethers } from "ethers"
import { GOVERNANCE_CONTRACT_ADDRESS, STELE_CONTRACT_ADDRESS } from "@/lib/constants"
import GovernorABI from "@/app/abis/SteleGovernor.json"

// Predefined governance proposal templates
interface ProposalTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  targetContract: string
  functionSignature: string
  parameterTypes: string[]
  parameterLabels: string[]
  parameterPlaceholders: string[]
  parameterDescriptions: string[]
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'set-token',
    name: 'Set Investable Token',
    description: 'Add or update an investable token in the system',
    icon: <Settings className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'setToken(address)',
    parameterTypes: ['address'],
    parameterLabels: ['Token Address'],
    parameterPlaceholders: ['0x...'],
    parameterDescriptions: ['The contract address of the token to be added as an investable asset']
  },
  {
    id: 'reset-token',
    name: 'Reset Investable Token',
    description: 'Remove an investable token from the system',
    icon: <Settings className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'removeToken(address)',
    parameterTypes: ['address'],
    parameterLabels: ['Token Address'],
    parameterPlaceholders: ['0x...'],
    parameterDescriptions: ['The contract address of the token to be removed from investable assets']
  },
  {
    id: 'set-reward-ratio',
    name: 'Set Reward Ratio',
    description: 'Update the reward distribution ratios for different rankings',
    icon: <DollarSign className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'setRewardRatio(uint256[5])',
    parameterTypes: ['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
    parameterLabels: ['1st Place (%)', '2nd Place (%)', '3rd Place (%)', '4th Place (%)', '5th Place (%)'],
    parameterPlaceholders: ['50', '30', '15', '3', '2'],
    parameterDescriptions: ['Percentage for 1st place', 'Percentage for 2nd place', 'Percentage for 3rd place', 'Percentage for 4th place', 'Percentage for 5th place']
  },
  {
    id: 'set-entry-fee',
    name: 'Set Entry Fee',
    description: 'Update the entry fee for participating in challenges',
    icon: <DollarSign className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'setEntryFee(uint256)',
    parameterTypes: ['uint256'],
    parameterLabels: ['Entry Fee'],
    parameterPlaceholders: ['50000000'],
    parameterDescriptions: ['The new entry fee in wei (for USDC, multiply by 1,000,000 for each dollar)']
  },
  {
    id: 'set-max-assets',
    name: 'Set Max Assets',
    description: 'Update the maximum number of assets allowed in a portfolio',
    icon: <Settings className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'setMaxAssets(uint8)',
    parameterTypes: ['uint8'],
    parameterLabels: ['Max Assets Count'],
    parameterPlaceholders: ['10'],
    parameterDescriptions: ['The maximum number of different tokens that can be held in a portfolio (1-255)']
  },
  {
    id: 'set-seed-money',
    name: 'Set Seed Money',
    description: 'Update the initial investment amount for mock trading',
    icon: <DollarSign className="h-5 w-5" />,
    targetContract: STELE_CONTRACT_ADDRESS,
    functionSignature: 'setSeedMoney(uint256)',
    parameterTypes: ['uint256'],
    parameterLabels: ['Seed Money Amount'],
    parameterPlaceholders: ['10000000000'],
    parameterDescriptions: ['The initial mock investment amount in wei (for USDC, multiply by 1,000,000 for each dollar)']
  },



  {
    id: 'set-voting-period',
    name: 'Set Voting Period',
    description: 'Update the duration of the voting period for proposals',
    icon: <Settings className="h-5 w-5" />,
    targetContract: GOVERNANCE_CONTRACT_ADDRESS,
    functionSignature: 'setVotingPeriod(uint256)',
    parameterTypes: ['uint256'],
    parameterLabels: ['Voting Period (blocks)'],
    parameterPlaceholders: ['50400'],
    parameterDescriptions: ['Number of blocks the voting period lasts (50400 blocks ≈ 7 days on Ethereum)']
  }
]

export default function CreateProposalPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [details, setDetails] = useState("")
  
  // Template-based proposal state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [isCustomProposal, setIsCustomProposal] = useState(false)
  const [templateParameters, setTemplateParameters] = useState<string[]>([])
  
  // Legacy smart contract call data (for custom proposals)
  const [targetAddress, setTargetAddress] = useState("")
  const [functionSignature, setFunctionSignature] = useState("")
  const [functionParams, setFunctionParams] = useState("")
  
  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
  }, [])

  // Get appropriate explorer URL based on chain ID
  const getExplorerUrl = (chainId: string, txHash: string) => {
    switch (chainId) {
      case '0x1': // Ethereum Mainnet
        return `https://etherscan.io/tx/${txHash}`;
      case '0x2105': // Base Mainnet
        return `https://basescan.org/tx/${txHash}`;
      case '0x89': // Polygon
        return `https://polygonscan.com/tx/${txHash}`;
      case '0xa': // Optimism
        return `https://optimistic.etherscan.io/tx/${txHash}`;
      case '0xa4b1': // Arbitrum One
        return `https://arbiscan.io/tx/${txHash}`;
      default:
        return `https://etherscan.io/tx/${txHash}`; // Default to Ethereum
    }
  };

  const getExplorerName = (chainId: string) => {
    switch (chainId) {
      case '0x1': // Ethereum Mainnet
        return 'Etherscan';
      case '0x2105': // Base Mainnet
        return 'BaseScan';
      case '0x89': // Polygon
        return 'PolygonScan';
      case '0xa': // Optimism
        return 'Optimistic Etherscan';
      case '0xa4b1': // Arbitrum One
        return 'Arbiscan';
      default:
        return 'Block Explorer';
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateName: string) => {
    if (templateName === 'Custom Proposal') {
      setIsCustomProposal(true);
      setSelectedTemplate('');
      setTemplateParameters([]);
    } else {
      setIsCustomProposal(false);
      const template = PROPOSAL_TEMPLATES.find(t => t.name === templateName);
      if (template) {
        setSelectedTemplate(template.id);
        setTemplateParameters(new Array(template.parameterTypes.length).fill(''));
      }
    }
  };

  // Update template parameter
  const updateTemplateParameter = (index: number, value: string) => {
    const newParams = [...templateParameters];
    newParams[index] = value;
    setTemplateParameters(newParams);
  };

  // Create calldata from template or custom input
  const createCalldata = () => {
    if (isCustomProposal) {
      // Legacy custom proposal logic
      if (!functionSignature || !targetAddress) return null;

      try {
        const funcName = functionSignature.split('(')[0];
        const paramTypes = functionSignature
          .split('(')[1]
          .replace(')', '')
          .split(',')
          .filter(p => p.trim().length > 0);

        let params: any[] = [];
        if (functionParams && paramTypes.length > 0) {
          params = functionParams.split(',').map((p: string, i: number) => {
            const paramType = paramTypes[i].trim();
            const param = p.trim();

            if (paramType.includes('uint')) {
              return param.startsWith('0x') ? param : ethers.parseUnits(param, 0);
            } else if (paramType.includes('bool')) {
              return param.toLowerCase() === 'true';
            } else {
              return param;
            }
          });
        }

        const functionFragment = ethers.FunctionFragment.from(`function ${funcName}(${paramTypes.join(',')})`);
        const iface = new ethers.Interface([functionFragment]);
        const calldata = iface.encodeFunctionData(funcName, params);

        return calldata;
      } catch (error) {
        console.error("Error creating calldata:", error);
        toast({
          variant: "destructive",
          title: "Invalid Function Data",
          description: "Please check your function signature and parameters.",
        });
        return null;
      }
    } else {
      // Template-based proposal logic
      const template = PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!template) return null;

      try {
        const funcName = template.functionSignature.split('(')[0];
        let paramTypes: string[];
        
        if (template.id === 'set-reward-ratio') {
          // For setRewardRatio, we need the actual function signature with uint256[5]
          paramTypes = ['uint256[5]'];
        } else {
          paramTypes = template.parameterTypes;
        }

        // Convert template parameters to proper types
        let params: any[] = [];
        
        if (template.id === 'set-reward-ratio') {
          // Special handling for setRewardRatio which needs an array of 5 uint256 values
          const rewardRatios = templateParameters.slice(0, 5).map(param => {
            const value = param.trim();
            return value.startsWith('0x') ? value : ethers.parseUnits(value, 0);
          });
          params = [rewardRatios];
        } else {
          // Regular parameter handling
          params = templateParameters.map((param, i) => {
            const paramType = paramTypes[i];
            const value = param.trim();

                         if (paramType.includes('uint8')) {
               // Handle uint8 specifically (0-255 range)
               const numValue = parseInt(value);
               if (numValue < 0 || numValue > 255) {
                 throw new Error('uint8 value must be between 0 and 255');
               }
               return numValue;
             } else if (paramType.includes('uint')) {
               return value.startsWith('0x') ? value : ethers.parseUnits(value, 0);
             } else if (paramType.includes('bool')) {
              return value.toLowerCase() === 'true';
            } else {
              return value;
            }
          });
        }

        const functionFragment = ethers.FunctionFragment.from(`function ${funcName}(${paramTypes.join(',')})`);
        const iface = new ethers.Interface([functionFragment]);
        const calldata = iface.encodeFunctionData(funcName, params);

        return calldata;
      } catch (error) {
        console.error("Error creating template calldata:", error);
        toast({
          variant: "destructive",
          title: "Invalid Template Parameters",
          description: "Please check your parameter values.",
        });
        return null;
      }
    }
  };
  
  // Proposal creation function
  const handleCreateProposal = async () => {
    // Validation
    if (!title || !description) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Title and description are required",
      })
      return
    }
    
    // Wallet connection check
    if (!walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a proposal",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Check if we have phantom wallet
      if (typeof window.phantom === 'undefined') {
        throw new Error("Phantom wallet is not installed. Please install it from https://phantom.app/");
      }

      // Check if Ethereum provider is available
      if (!window.phantom?.ethereum) {
        throw new Error("Ethereum provider not found in Phantom wallet");
      }

      // Request account access if needed
      const accounts = await window.phantom.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect to Phantom wallet first.");
      }

      // Get current network information
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      console.log('Current network chain ID:', chainId);
      
      // Use current network without switching
      // No automatic network switching - use whatever network user is currently on

      // Create a Web3Provider using the Phantom ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum);
      
      // Get the signer
      const signer = await provider.getSigner();
      
      // Create contract instance
      const governorContract = new ethers.Contract(
        GOVERNANCE_CONTRACT_ADDRESS,
        GovernorABI.abi,
        signer
      );

      // Prepare proposal parameters
      let targets: string[] = [];
      let values: bigint[] = [];
      let calldatas: string[] = [];

      if (isCustomProposal) {
        // Custom proposal logic
        targets = targetAddress ? [targetAddress] : [];
        values = targetAddress ? [BigInt(0)] : [];
        
        if (targetAddress && functionSignature) {
          const calldata = createCalldata();
          if (calldata) {
            calldatas = [calldata];
          } else {
            throw new Error("Failed to create calldata. Please check function signature and parameters.");
          }
        } else if (targetAddress) {
          calldatas = ['0x'];
        }
      } else if (selectedTemplate) {
        // Template-based proposal logic
        const template = PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplate);
        if (!template) {
          throw new Error("Invalid template selected.");
        }

        targets = [template.targetContract];
        values = [BigInt(0)];
        
        const calldata = createCalldata();
        if (calldata) {
          calldatas = [calldata];
        } else {
          throw new Error("Failed to create calldata from template. Please check your parameter values.");
        }
      }
      
      // Combine title and description for the proposal
      const proposalDescription = `${title}: ${description}\n\n${details}`;

      // Only proceed if either we have no target (text proposal) or we have all necessary parameters
      if (targets.length === 0 || (targets.length > 0 && calldatas.length > 0)) {
        // Call the propose function on the governor contract
        const tx = await governorContract.propose(
          targets,
          values,
          calldatas,
          proposalDescription
        );
        
        setTransactionHash(tx.hash);
        
        // Show toast notification for transaction submitted
        const explorerName = getExplorerName(chainId);
        const explorerUrl = getExplorerUrl(chainId, tx.hash);
        
        toast({
          title: "Transaction Submitted",
          description: "Your proposal transaction has been sent to the network.",
          action: (
            <ToastAction 
              altText={`View on ${explorerName}`} 
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              View on {explorerName}
            </ToastAction>
          ),
        });
        
        // Store the recently created proposal info for real-time update detection
        const recentlyCreatedProposal = {
          transactionHash: tx.hash,
          title: title,
          description: description,
          timestamp: Date.now()
        };
        localStorage.setItem('recentlyCreatedProposal', JSON.stringify(recentlyCreatedProposal));
        
        // Continue processing transaction in background
        try {
          // Wait for transaction to be mined
          const receipt = await tx.wait();
          
          // Show toast notification for transaction confirmed
          toast({
            title: "Proposal Created Successfully",
            description: "Your proposal has been confirmed on the blockchain",
            action: (
              <ToastAction 
                altText={`View on ${explorerName}`} 
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                View on {explorerName}
              </ToastAction>
            ),
          });
        } catch (confirmationError) {
          console.error("Error waiting for transaction confirmation:", confirmationError);
          // Still navigate to vote page even if confirmation fails
        }
      } else {
        throw new Error("Invalid proposal parameters. Please check your inputs.");
      }
    } catch (error: any) {
      console.error("Error creating proposal:", error);
      toast({
        variant: "destructive",
        title: "Proposal Creation Failed",
        description: error.message || "There was an error creating your proposal. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      
      // Navigate to vote page only if there's no error and we have stored proposal data
      const storedProposal = localStorage.getItem('recentlyCreatedProposal');
      if (storedProposal) {
        // Wait 1 second after submitting state ends before navigating
        setTimeout(async () => {
          // Invalidate all proposal-related queries to refresh vote page data
          await queryClient.invalidateQueries({ queryKey: ['proposals'] });
          await queryClient.invalidateQueries({ queryKey: ['activeProposals'] });
          await queryClient.invalidateQueries({ queryKey: ['proposalsByStatus'] });
          await queryClient.invalidateQueries({ queryKey: ['multipleProposalVoteResults'] });
          
          // Navigate to vote page
          router.push("/vote");
        }, 1000);
      }
    }
  }
  
  return (
    <div className="container mx-auto p-6 py-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Create Proposal</h1>
            <p className="text-gray-400 mt-1">Submit a new governance proposal to the community</p>
          </div>
        </div>
        <Card className="bg-transparent border border-gray-700/50">
          <CardContent className="space-y-8 p-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              
              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-gray-200 text-base font-medium">Proposal Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter a clear and concise title for your proposal." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-12 text-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-gray-200 text-base font-medium">Short Description *</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Provide a brief summary of what your proposal aims to achieve." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 min-h-[100px] text-base"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="details" className="text-gray-200 text-base font-medium">Detailed Description</Label>
                  <Textarea 
                    id="details" 
                    placeholder="Explain your proposal in detail." 
                    className="min-h-[200px] bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 text-base"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
            
            {/* Governance Action Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-700/50 pb-4">
                <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Governance Action
                </h3>
                <p className="text-sm text-gray-400 mt-1">Define the on-chain action this proposal will execute</p>
              </div>
              
              <div className="bg-gray-800/20 border border-gray-600/50 rounded-lg p-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="template" className="text-gray-200 text-base font-medium">Select Proposal Type</Label>
                  <Select onValueChange={handleTemplateSelect} disabled={isSubmitting}>
                    <SelectTrigger className="bg-gray-800/30 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20 h-12">
                      <SelectValue placeholder="Choose a governance action..." />
                    </SelectTrigger>
                    <SelectContent className="bg-black/80 border-gray-600">
                      {PROPOSAL_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.name} className="text-gray-100 focus:bg-gray-700">
                          {template.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="Custom Proposal" className="text-gray-100 focus:bg-gray-700">
                        Custom Proposal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

                {/* Template Parameters */}
                {selectedTemplate && !isCustomProposal && (
                  <div className="space-y-4 bg-gray-700/20 border border-gray-600/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300">Template Parameters</h4>
                    <div className="space-y-4">
                      {PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplate)?.parameterLabels.map((label, index) => {
                        const template = PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplate)!;
                        return (
                          <div key={index} className="space-y-2">
                            <Label htmlFor={`param-${index}`} className="text-gray-200 text-sm font-medium">{label}</Label>
                            <Input 
                              id={`param-${index}`}
                              placeholder={template.parameterPlaceholders[index]}
                              value={templateParameters[index] || ''}
                              onChange={(e) => updateTemplateParameter(index, e.target.value)}
                              disabled={isSubmitting}
                              className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                            />
                            <p className="text-xs text-gray-400">{template.parameterDescriptions[index]}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Proposal Fields */}
                {isCustomProposal && (
                  <div className="space-y-4 bg-gray-700/20 border border-gray-600/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300">Custom Contract Interaction</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="target" className="text-gray-200 text-sm font-medium">Target Contract Address</Label>
                        <Input 
                          id="target" 
                          placeholder="0x..." 
                          value={targetAddress}
                          onChange={(e) => setTargetAddress(e.target.value)}
                          disabled={isSubmitting}
                          className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="function" className="text-gray-200 text-sm font-medium">Function Signature</Label>
                        <Input 
                          id="function" 
                          placeholder="e.g. setRewardAmount(uint256)" 
                          value={functionSignature}
                          onChange={(e) => setFunctionSignature(e.target.value)}
                          disabled={isSubmitting}
                          className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="params" className="text-gray-200 text-sm font-medium">Function Parameters (comma separated)</Label>
                        <Input 
                          id="params" 
                          placeholder="e.g. 150000000" 
                          value={functionParams}
                          onChange={(e) => setFunctionParams(e.target.value)}
                          disabled={isSubmitting}
                          className="bg-gray-800/30 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                        />
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
          <CardFooter className="pt-8 pb-8">
            <div className="flex items-center justify-center w-full">
              <Button 
                variant="default"
                size="lg"
                onClick={handleCreateProposal}
                disabled={isSubmitting || !title || !description || (!isCustomProposal && !selectedTemplate)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-12 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-3 h-5 w-5" />
                    Create Proposal
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 