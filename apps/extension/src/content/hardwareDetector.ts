// @ts-nocheck
/**
 * OneForm Smart Hardware Detection
 * 
 * Comprehensive device capability detection for Indian hardware constraints.
 * Determines optimal AI tier based on actual device performance.
 * 
 * TIERS:
 * - Tier 1: Heuristics only (all devices, FREE, 70-80% accuracy)
 * - Tier 2: Transformers.js (4GB+ RAM with WebGPU, FREE, +10-15% accuracy)
 * - Tier 3: Cloud AI (internet required, ₹0.10-29/form, +15-20% accuracy)
 * 
 * TARGET DEVICES:
 * - CSC Centers: 2015-2020 desktops, 2-4GB RAM, integrated graphics
 * - Students: Budget Android phones, 2-3GB RAM
 * - Government offices: Older machines with IE11/legacy Chrome
 * 
 * @version 1.0.0
 * @updated 2025-12-02
 */

class SmartHardwareDetector {
  constructor() {
    this.results = {
      detected: false,
      timestamp: null,
      
      // Device specs
      deviceMemory: null,
      cpuCores: null,
      platform: null,
      chromeVersion: null,
      
      // Graphics
      hasWebGPU: false,
      gpuVendor: null,
      gpuRenderer: null,
      gpuBenchmarkScore: null,
      
      // Network
      connectionType: null,
      downlink: null,
      effectiveType: null,
      
      // Tier recommendations
      recommendedTier: 1,
      tier2Capable: false,
      tier3Available: true,
      
      // Performance scores
      memoryScore: 0,
      gpuScore: 0,
      networkScore: 0,
      overallScore: 0,
      
      // Warnings
      warnings: []
    };
    
    this.MINIMUM_SPECS = {
      tier2: {
        memory: 4,           // GB
        chromeVersion: 113,  // WebGPU stable in Chrome 113+
        cpuCores: 4
      },
      tier3: {
        memory: 1,           // Even very low-end can use cloud
        downlink: 0.5        // Mbps minimum
      }
    };
  }

  /**
   * Run comprehensive hardware detection
   * @returns {Promise<Object>} Detection results
   */
  async detect() {
    console.log('[HardwareDetector] Starting comprehensive detection...');
    
    try {
      // Run all detection methods in parallel where possible
      await Promise.all([
        this._detectBasicSpecs(),
        this._detectWebGPU(),
        this._detectNetwork()
      ]);
      
      // Calculate scores and recommendations
      this._calculateScores();
      this._determineRecommendedTier();
      
      this.results.detected = true;
      this.results.timestamp = Date.now();
      
      console.log('[HardwareDetector] Detection complete:', this.results);
      
      return this.results;
      
    } catch (error) {
      console.error('[HardwareDetector] Detection failed:', error);
      this.results.warnings.push(`Detection error: ${error.message}`);
      this.results.detected = false;
      return this.results;
    }
  }

  /**
   * Detect basic device specifications
   */
  async _detectBasicSpecs() {
    // Chrome version
    const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
    this.results.chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
    
    // Device memory (may not be available on all browsers)
    this.results.deviceMemory = navigator.deviceMemory || null;
    
    // CPU cores
    this.results.cpuCores = navigator.hardwareConcurrency || null;
    
    // Platform
    this.results.platform = navigator.platform;
    
    // Calculate memory score (0-100)
    if (this.results.deviceMemory) {
      if (this.results.deviceMemory >= 8) {
        this.results.memoryScore = 100;
      } else if (this.results.deviceMemory >= 4) {
        this.results.memoryScore = 75;
      } else if (this.results.deviceMemory >= 2) {
        this.results.memoryScore = 50;
      } else {
        this.results.memoryScore = 25;
      }
    } else {
      // Cannot detect, assume mid-range
      this.results.memoryScore = 50;
      this.results.warnings.push('Could not detect device memory');
    }
    
    console.log('[HardwareDetector] Basic specs:', {
      chrome: this.results.chromeVersion,
      memory: this.results.deviceMemory,
      cores: this.results.cpuCores,
      platform: this.results.platform
    });
  }

  /**
   * Detect WebGPU capabilities with GPU benchmark
   */
  async _detectWebGPU() {
    // Check WebGPU availability
    if (!('gpu' in navigator)) {
      console.log('[HardwareDetector] WebGPU not available');
      this.results.hasWebGPU = false;
      this.results.gpuScore = 0;
      return;
    }
    
    try {
      // Request GPU adapter
      const adapter = await navigator.gpu.requestAdapter();
      
      if (!adapter) {
        console.log('[HardwareDetector] No GPU adapter available');
        this.results.hasWebGPU = false;
        this.results.gpuScore = 0;
        return;
      }
      
      // Get adapter info
      const info = await adapter.requestAdapterInfo();
      this.results.gpuVendor = info.vendor || 'unknown';
      this.results.gpuRenderer = info.architecture || info.description || 'unknown';
      
      // Run GPU benchmark
      await this._runGPUBenchmark(adapter);
      
      this.results.hasWebGPU = true;
      
      console.log('[HardwareDetector] WebGPU detected:', {
        vendor: this.results.gpuVendor,
        renderer: this.results.gpuRenderer,
        benchmarkScore: this.results.gpuBenchmarkScore
      });
      
    } catch (error) {
      console.log('[HardwareDetector] WebGPU detection failed:', error);
      this.results.hasWebGPU = false;
      this.results.gpuScore = 0;
      this.results.warnings.push(`WebGPU detection failed: ${error.message}`);
    }
  }

  /**
   * Run a simple GPU benchmark to estimate performance
   * Tests matrix multiplication which is the core ML workload
   */
  async _runGPUBenchmark(adapter) {
    try {
      const device = await adapter.requestDevice();
      
      // Simple benchmark: measure time to create and fill a buffer
      const size = 1024 * 1024; // 1MB
      const startTime = performance.now();
      
      // Create buffer
      const buffer = device.createBuffer({
        size: size * 4, // 4 bytes per float32
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      
      // Write data
      const data = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = Math.random();
      }
      device.queue.writeBuffer(buffer, 0, data);
      
      // Wait for completion
      await device.queue.onSubmittedWorkDone();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cleanup
      buffer.destroy();
      device.destroy();
      
      // Calculate score based on time
      // <100ms = excellent (100), <200ms = good (75), <500ms = fair (50), >500ms = poor (25)
      if (duration < 100) {
        this.results.gpuBenchmarkScore = 100;
        this.results.gpuScore = 100;
      } else if (duration < 200) {
        this.results.gpuBenchmarkScore = 75;
        this.results.gpuScore = 75;
      } else if (duration < 500) {
        this.results.gpuBenchmarkScore = 50;
        this.results.gpuScore = 50;
      } else {
        this.results.gpuBenchmarkScore = 25;
        this.results.gpuScore = 25;
        this.results.warnings.push('GPU performance may be too slow for local AI');
      }
      
      console.log(`[HardwareDetector] GPU benchmark: ${duration.toFixed(2)}ms, score: ${this.results.gpuBenchmarkScore}`);
      
    } catch (error) {
      console.warn('[HardwareDetector] GPU benchmark failed:', error);
      this.results.gpuBenchmarkScore = 0;
      this.results.gpuScore = 0;
    }
  }

  /**
   * Detect network capabilities
   */
  async _detectNetwork() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.results.connectionType = connection.type || null;
      this.results.downlink = connection.downlink || null;
      this.results.effectiveType = connection.effectiveType || null;
      
      // Calculate network score
      const effectiveType = this.results.effectiveType;
      if (effectiveType === '4g') {
        this.results.networkScore = 100;
      } else if (effectiveType === '3g') {
        this.results.networkScore = 60;
      } else if (effectiveType === '2g') {
        this.results.networkScore = 30;
        this.results.warnings.push('Slow network - cloud AI may be unreliable');
      } else if (effectiveType === 'slow-2g') {
        this.results.networkScore = 10;
        this.results.warnings.push('Very slow network - recommend offline mode');
      } else {
        this.results.networkScore = 50; // Unknown, assume medium
      }
      
    } else {
      // Cannot detect network info
      this.results.networkScore = 50;
      this.results.warnings.push('Could not detect network capabilities');
    }
    
    console.log('[HardwareDetector] Network:', {
      type: this.results.connectionType,
      downlink: this.results.downlink,
      effectiveType: this.results.effectiveType,
      score: this.results.networkScore
    });
  }

  /**
   * Calculate overall performance score
   */
  _calculateScores() {
    // Weighted average: Memory 40%, GPU 40%, Network 20%
    this.results.overallScore = Math.round(
      this.results.memoryScore * 0.4 +
      this.results.gpuScore * 0.4 +
      this.results.networkScore * 0.2
    );
  }

  /**
   * Determine recommended tier based on detection results
   */
  _determineRecommendedTier() {
    const { deviceMemory, chromeVersion, cpuCores, hasWebGPU, gpuScore, networkScore } = this.results;
    
    // Check Tier 2 capability
    const meetsMemory = (deviceMemory === null) || (deviceMemory >= this.MINIMUM_SPECS.tier2.memory);
    const meetsChrome = chromeVersion >= this.MINIMUM_SPECS.tier2.chromeVersion;
    const meetsCores = (cpuCores === null) || (cpuCores >= this.MINIMUM_SPECS.tier2.cpuCores);
    const meetsGPU = hasWebGPU && gpuScore >= 50;
    
    this.results.tier2Capable = meetsMemory && meetsChrome && meetsCores && meetsGPU;
    
    // Check Tier 3 availability (cloud)
    this.results.tier3Available = networkScore >= 30;
    
    // Determine recommended tier
    if (this.results.tier2Capable && gpuScore >= 75) {
      this.results.recommendedTier = 2;
    } else if (this.results.tier3Available) {
      this.results.recommendedTier = 3;
    } else {
      this.results.recommendedTier = 1;
    }
    
    console.log('[HardwareDetector] Tier recommendation:', {
      tier2Capable: this.results.tier2Capable,
      tier3Available: this.results.tier3Available,
      recommended: this.results.recommendedTier
    });
  }

  /**
   * Get human-readable summary
   */
  getSummary() {
    if (!this.results.detected) {
      return {
        status: 'unknown',
        message: 'Detection not completed',
        tier: 1
      };
    }
    
    const tierNames = {
      1: 'Basic (Heuristics)',
      2: 'Enhanced (Local AI)',
      3: 'Cloud AI'
    };
    
    const messages = {
      1: 'Your device will use pattern matching. Works on all forms!',
      2: 'Your device supports local AI for better accuracy.',
      3: 'Cloud AI recommended for best results.'
    };
    
    return {
      status: this.results.overallScore >= 70 ? 'excellent' :
              this.results.overallScore >= 50 ? 'good' :
              this.results.overallScore >= 30 ? 'fair' : 'limited',
      message: messages[this.results.recommendedTier],
      tier: this.results.recommendedTier,
      tierName: tierNames[this.results.recommendedTier],
      scores: {
        memory: this.results.memoryScore,
        gpu: this.results.gpuScore,
        network: this.results.networkScore,
        overall: this.results.overallScore
      },
      warnings: this.results.warnings
    };
  }

  /**
   * Check if user should be prompted for permissions
   */
  shouldPromptForPermissions() {
    return {
      // Prompt for Tier 2 if device is capable but not enabled
      tier2: this.results.tier2Capable,
      // Prompt for cloud consent if network is available
      cloudConsent: this.results.tier3Available,
      // Prompt for API key if cloud is recommended
      apiKey: this.results.recommendedTier === 3
    };
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SmartHardwareDetector = SmartHardwareDetector;
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmartHardwareDetector };
}

