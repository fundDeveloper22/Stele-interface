'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ethers } from "ethers"
import { GOVERNANCE_CONTRACT_ADDRESS } from "@/lib/constants"
import { BASE_CHAIN_ID, BASE_CHAIN_CONFIG } from "@/lib/constants"
import GovernorABI from "@/app/abis/SteleGovernor.json"

export default function CreateProposalPage() {
  const router = useRouter()
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [details, setDetails] = useState("")
  
  // Smart contract call data (example)
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

  // Create calldata from function signature and parameters
  const createCalldata = () => {
    if (!functionSignature || !targetAddress) return null;

    try {
      // Parse the function signature (e.g., "setRewardAmount(uint256)")
      const funcName = functionSignature.split('(')[0];
      const paramTypes = functionSignature
        .split('(')[1]
        .replace(')', '')
        .split(',')
        .filter(p => p.trim().length > 0);

      // Parse the parameters
      let params: any[] = [];
      if (functionParams && paramTypes.length > 0) {
        params = functionParams.split(',').map((p: string, i: number) => {
          const paramType = paramTypes[i].trim();
          const param = p.trim();

          // Convert parameter based on type (basic handling for common types)
          if (paramType.includes('uint')) {
            return param.startsWith('0x') ? param : ethers.parseUnits(param, 0);
          } else if (paramType.includes('bool')) {
            return param.toLowerCase() === 'true';
          } else {
            return param; // string, address, etc.
          }
        });
      }

      // Create the function selector and encode parameters
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

      // Check if we are on Base network
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== BASE_CHAIN_ID) { // Base Mainnet Chain ID
        // Switch to Base network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID }], // Base Mainnet
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to the wallet
          if (switchError.code === 4902) {
            await window.phantom.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_CHAIN_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

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
      const targets: string[] = targetAddress ? [targetAddress] : [];
      const values: bigint[] = targetAddress ? [BigInt(0)] : []; // No ETH being sent
      
      let calldatas: string[] = [];
      if (targetAddress && functionSignature) {
        const calldata = createCalldata();
        if (calldata) {
          calldatas = [calldata];
        } else {
          throw new Error("Failed to create calldata. Please check function signature and parameters.");
        }
      } else if (targetAddress) {
        // If only target address is provided but no function data, use empty calldata
        calldatas = ['0x'];
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
        toast({
          title: "Transaction Submitted",
          description: "Your proposal transaction has been sent to the network.",
          action: (
            <ToastAction 
              altText="View on BaseScan" 
              onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}
            >
              View on BaseScan
            </ToastAction>
          ),
        });
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        
        // Show toast notification for transaction confirmed
        toast({
          title: "Proposal Created Successfully",
          description: "Your proposal has been submitted to the governance system",
          action: (
            <ToastAction 
              altText="View on BaseScan" 
              onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}
            >
              View on BaseScan
            </ToastAction>
          ),
        });
        
        // Navigate to proposal list page
        router.push("/vote");
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
    }
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/vote">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-xl text-gray-100">Create New Proposal</CardTitle>
            <CardDescription className="text-gray-300">
              Submit a proposal to be voted on by the community. You need to have enough voting power to create a proposal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-200">Proposal Title</Label>
              <Input 
                id="title" 
                placeholder="Enter a concise title for your proposal" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-200">Short Description</Label>
              <Textarea 
                id="description" 
                placeholder="Provide a brief summary of what your proposal aims to achieve" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="details" className="text-gray-200">Detailed Description</Label>
              <Textarea 
                id="details" 
                placeholder="Explain your proposal in detail, including rationale and implementation details" 
                className="min-h-[150px] bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-4 border border-gray-600 rounded-md p-4 bg-gray-800/30">
              <h3 className="text-sm font-medium text-gray-200">Contract Interaction (Optional)</h3>
              <div className="space-y-2">
                <Label htmlFor="target" className="text-gray-200">Target Contract Address</Label>
                <Input 
                  id="target" 
                  placeholder="0x..." 
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="function" className="text-gray-200">Function Signature</Label>
                <Input 
                  id="function" 
                  placeholder="e.g. setRewardAmount(uint256)" 
                  value={functionSignature}
                  onChange={(e) => setFunctionSignature(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="params" className="text-gray-200">Function Parameters (comma separated)</Label>
                <Input 
                  id="params" 
                  placeholder="e.g. 150000000" 
                  value={functionParams}
                  onChange={(e) => setFunctionParams(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleCreateProposal}
              disabled={isSubmitting || !title || !description}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Proposal
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 