class PrintQueue {
  constructor() {
    this.jobs = [];
    this.maxHistory = 50;
    this.isProcessing = false;
    this.statusListeners = new Set();
  }

  addStatusListener(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  notifyListeners(job) {
    for (const listener of this.statusListeners) {
      try {
        listener(job);
      } catch (e) {
        console.error('Error in print status listener:', e);
      }
    }
  }

  createJob({ photoUrl, printerName, config, copies = 1, source = 'customer' }) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      photoUrl,
      printerName: printerName || config?.printerName || 'Default',
      config: { ...config },
      copies: Math.max(1, Number(copies) || 1),
      source, // 'customer' | 'admin' | 'test'
      status: 'Pending', // 'Pending' | 'Printing' | 'Completed' | 'Failed'
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.jobs.unshift(job);
    if (this.jobs.length > this.maxHistory) {
      this.jobs.pop();
    }

    this.notifyListeners(job);
    return job;
  }

  updateJob(id, updates) {
    const job = this.jobs.find(j => j.id === id);
    if (job) {
      Object.assign(job, updates);
      if (updates.status === 'Completed' || updates.status === 'Failed') {
        job.completedAt = new Date().toISOString();
      }
      this.notifyListeners(job);
    }
    return job;
  }

  getJob(id) {
    return this.jobs.find(j => j.id === id) || null;
  }

  getJobs() {
    return [...this.jobs];
  }

  getPendingJob() {
    // Return oldest pending job
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      if (this.jobs[i].status === 'Pending') {
        return this.jobs[i];
      }
    }
    return null;
  }
}

export const printQueue = new PrintQueue();

