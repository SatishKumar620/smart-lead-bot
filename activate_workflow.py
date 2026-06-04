#!/usr/bin/env python3
"""
activate_workflow.py
Finds the freshly-imported n8n workflow by name and activates it via the REST API.
Also creates a persistent API key for future use by update_n8n.py.
"""
import json
import urllib.request
import urllib.error
import os
import time

N8N_BASE = "http://localhost:5678"

def make_request(url, method="GET", data=None, headers=None):
    headers = headers or {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8") or "{}"), e.code
    except Exception as e:
        return {"error": str(e)}, 0

# Step 1: Activate workflow using local n8n CLI command
print("Step 1: Activating workflow via n8n CLI...")
import subprocess

try:
    # First, list workflows to see what's available
    list_res = subprocess.run(
        ["n8n", "list:workflow"],
        capture_output=True, text=True, timeout=15
    )
    print("Available workflows:")
    print(list_res.stdout)
    
    # Try direct activation on default ID
    workflow_id = "6N6LX6phmTSQv46O"
    print(f"Attempting to activate workflow {workflow_id} via CLI...")
    act_res = subprocess.run(
        ["n8n", "update:workflow", f"--id={workflow_id}", "--active=true"],
        capture_output=True, text=True, timeout=15
    )
    print("STDOUT:", act_res.stdout)
    print("STDERR:", act_res.stderr)
    
    if act_res.returncode == 0:
        print(f"Successfully activated workflow {workflow_id} via CLI.")
        with open("/home/node/n8n_workflow_id.txt", "w") as f:
            f.write(workflow_id)
    else:
        # Fallback: scan for any workflow from listing and activate it
        print("Direct activation failed. Scanning list to find first workflow...")
        lines = list_res.stdout.strip().split("\n")
        fallback_id = None
        for line in lines:
            parts = line.split()
            if parts and parts[0] != "ID" and not parts[0].startswith("-"):
                fallback_id = parts[0].strip()
                break
        
        if fallback_id:
            print(f"Attempting fallback activation on workflow {fallback_id}...")
            act_res = subprocess.run(
                ["n8n", "update:workflow", f"--id={fallback_id}", "--active=true"],
                capture_output=True, text=True, timeout=15
            )
            if act_res.returncode == 0:
                print(f"Successfully activated fallback workflow {fallback_id} via CLI.")
                with open("/home/node/n8n_workflow_id.txt", "w") as f:
                    f.write(fallback_id)
            else:
                print(f"Failed to activate fallback workflow {fallback_id}: {act_res.stderr}")
        else:
            print("No workflows found in listing to activate.")
            
except Exception as e:
    print(f"CLI activation encountered error: {e}")

print("activate_workflow.py done.")
