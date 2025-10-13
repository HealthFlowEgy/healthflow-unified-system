#!/bin/bash

# Performance Monitoring Script
# Monitor system resources during load testing

echo "Starting performance monitoring..."
echo "Monitoring CPU, Memory, Disk, Network..."
echo "Press Ctrl+C to stop"

# Create log directory
mkdir -p logs/performance

# Get timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/performance/perf_${TIMESTAMP}.log"

# Monitor loop
while true; do
  echo "=== $(date) ===" >> "$LOG_FILE"
  
  # CPU usage
  echo "CPU Usage:" >> "$LOG_FILE"
  top -bn1 | grep "Cpu(s)" >> "$LOG_FILE"
  
  # Memory usage
  echo "Memory Usage:" >> "$LOG_FILE"
  free -h >> "$LOG_FILE"
  
  # Disk usage
  echo "Disk Usage:" >> "$LOG_FILE"
  df -h >> "$LOG_FILE"
  
  # Docker stats
  echo "Docker Stats:" >> "$LOG_FILE"
  docker stats --no-stream >> "$LOG_FILE"
  
  echo "" >> "$LOG_FILE"
  
  sleep 5
done
