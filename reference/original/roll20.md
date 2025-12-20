Roll20 is a real-time collaborative web application with a client-server architecture and event-driven state synchronization.
Core Architecture:

Centralized server maintains authoritative game state (map data, token positions, character sheets, fog of war, all assets)
WebSocket connections to each client for bidirectional real-time communication
Browser-based clients (HTML5 Canvas for the map/tokens, JavaScript for UI/logic)

Permission Model (Role-Based Access Control):
GM role has elevated privileges:

Full read/write on all game state
Controls visibility layers (what each player can see via fog of war, dynamic lighting)
Can manipulate any token, reveal/hide map layers
Manages handouts, NPCs, environmental effects

Player role has restricted privileges:

Read access to shared game state (visible map areas, other players' tokens in view)
Write access limited to owned entities (their character tokens, character sheet)
No access to GM-only layers or hidden content

State Synchronization Pattern:

Player moves their token → generates event
Client sends action to server via WebSocket
Server validates permission (does this player own this token?)
Server updates authoritative game state
Server broadcasts state delta to all connected clients
All clients receive update and render new token position

This is optimistic UI with eventual consistency - your local client updates immediately (optimistic), but the server is the source of truth. If the server rejects your action, it gets rolled back.
Key Technical Challenges They Solve:

Conflict resolution: If GM and player try to move the same token simultaneously, server timestamp determines winner
Visibility calculations: Server computes what each player can see based on fog of war/line of sight, sends different view data to each client
Asset streaming: Maps/tokens are loaded on-demand, not all at once (otherwise bandwidth would explode)
State persistence: Game state continuously saved to database so disconnects don't lose progress

What This Isn't:
This is not peer-to-peer. Players don't communicate directly. All state changes flow through the central server, which acts as the authoritative referee and broadcaster.
Similar Pattern:
Google Docs uses nearly identical architecture - real-time collaborative editing where the server maintains truth and broadcasts changes to all viewers, but with user-specific permissions determining what each person can see and edit.
The GM's "control of visibility" is the interesting wrinkle - the server literally sends different rendered views to different clients based on calculated visibility rules. Player A might see a fog-covered area while the GM sees the whole map.