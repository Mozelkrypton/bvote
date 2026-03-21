// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainVote {

    enum VoterStatus { Unregistered, Pending, Approved, Rejected, Suspended }
    enum CandStatus  { Pending, Approved, Disqualified }
    enum ElecStatus  { Pending, Open, Closed, Cancelled }

    struct Voter {
        address wallet;
        string  fullName;
        string  idHash;
        string  district;
        VoterStatus status;
        uint256 registeredAt;
        bool    exists;
    }

    struct Candidate {
        uint256    id;
        string     fullName;
        string     party;
        string     position;
        CandStatus status;
        uint256    registeredAt;
        bool       exists;
    }

    struct Election {
        uint256    id;
        string     name;
        string     description;
        uint256    startTime;
        uint256    endTime;
        ElecStatus status;
        uint256[]  candidateIds;
        uint256    totalVotes;
        bool       resultsPublished;
        bool       exists;
    }

    address public superAdmin;
    uint256 public deployedAt;

    uint256 private _electionCounter;
    uint256 private _candidateCounter;

    mapping(address => Voter)     public voters;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => Election)  public elections;

    mapping(uint256 => mapping(uint256 => uint256)) public voteCounts;
    mapping(uint256 => mapping(address => bool))    public hasVoted;
    mapping(uint256 => mapping(address => bytes32)) public voteReceipt;

    address[] public voterAddresses;
    uint256[] public electionIds;
    uint256[] public candidateIds;

    mapping(address => bool) public isAdmin;
    address[] public adminList;

    event VoterRegistered    (address indexed wallet, string name, string district);
    event VoterStatusUpdated (address indexed wallet, VoterStatus status, address by);
    event CandidateAdded     (uint256 indexed id, string name, string party);
    event CandidateUpdated   (uint256 indexed id, CandStatus status, address by);
    event ElectionCreated    (uint256 indexed id, string name, uint256 start, uint256 end);
    event ElectionUpdated    (uint256 indexed id, ElecStatus status, address by);
    event VoteCast           (uint256 indexed electionId, bytes32 receiptHash, uint256 timestamp);
    event ResultsPublished   (uint256 indexed electionId, uint256 totalVotes);
    event AdminGranted       (address indexed account, address by);
    event AdminRevoked       (address indexed account, address by);

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "SuperAdmin only");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == superAdmin || isAdmin[msg.sender], "Admin only");
        _;
    }

    modifier onlyApprovedVoter() {
        require(voters[msg.sender].exists, "Not registered");
        require(voters[msg.sender].status == VoterStatus.Approved, "Not approved");
        _;
    }

    modifier electionExists(uint256 id) {
        require(elections[id].exists, "Election not found");
        _;
    }

    modifier candidateExists(uint256 id) {
        require(candidates[id].exists, "Candidate not found");
        _;
    }

    //  No arguments needed
    constructor() {
        superAdmin = msg.sender;
        deployedAt = block.timestamp;

        voters[msg.sender] = Voter({
            wallet:       msg.sender,
            fullName:     "Super Admin",
            idHash:       "SUPERADMIN",
            district:     "HQ",
            status:       VoterStatus.Approved,
            registeredAt: block.timestamp,
            exists:       true
        });
        voterAddresses.push(msg.sender);
    }

    // SUPERADMIN 

    function grantAdmin(address account) external onlySuperAdmin {
        require(account != address(0), "Invalid address");
        require(!isAdmin[account], "Already admin");
        isAdmin[account] = true;
        adminList.push(account);
        emit AdminGranted(account, msg.sender);
    }

    function revokeAdmin(address account) external onlySuperAdmin {
        require(isAdmin[account], "Not an admin");
        isAdmin[account] = false;
        emit AdminRevoked(account, msg.sender);
    }

    // VOTER REGISTRATION 

    function registerVoter(
        string calldata _fullName,
        string calldata _idHash,
        string calldata _district
    ) external {
        require(!voters[msg.sender].exists, "Already registered");
        require(bytes(_fullName).length > 0, "Name required");
        require(bytes(_idHash).length > 0, "ID hash required");

        voters[msg.sender] = Voter({
            wallet:       msg.sender,
            fullName:     _fullName,
            idHash:       _idHash,
            district:     _district,
            status:       VoterStatus.Pending,
            registeredAt: block.timestamp,
            exists:       true
        });
        voterAddresses.push(msg.sender);
        emit VoterRegistered(msg.sender, _fullName, _district);
    }

    function adminRegisterVoter(
        address _wallet,
        string calldata _fullName,
        string calldata _idHash,
        string calldata _district
    ) external onlyAdmin {
        require(_wallet != address(0), "Invalid wallet");
        require(!voters[_wallet].exists, "Already registered");
        require(bytes(_fullName).length > 0, "Name required");

        voters[_wallet] = Voter({
            wallet:       _wallet,
            fullName:     _fullName,
            idHash:       _idHash,
            district:     _district,
            status:       VoterStatus.Approved,
            registeredAt: block.timestamp,
            exists:       true
        });
        voterAddresses.push(_wallet);
        emit VoterRegistered(_wallet, _fullName, _district);
        emit VoterStatusUpdated(_wallet, VoterStatus.Approved, msg.sender);
    }

    function setVoterStatus(address _wallet, VoterStatus _status) external onlyAdmin {
        require(voters[_wallet].exists, "Voter not found");
        voters[_wallet].status = _status;
        emit VoterStatusUpdated(_wallet, _status, msg.sender);
    }

    //  CANDIDATES 

    function addCandidate(
        string calldata _fullName,
        string calldata _party,
        string calldata _position
    ) external onlyAdmin returns (uint256) {
        require(bytes(_fullName).length > 0, "Name required");

        _candidateCounter++;
        uint256 newId = _candidateCounter;

        candidates[newId] = Candidate({
            id:           newId,
            fullName:     _fullName,
            party:        _party,
            position:     _position,
            status:       CandStatus.Approved,
            registeredAt: block.timestamp,
            exists:       true
        });
        candidateIds.push(newId);
        emit CandidateAdded(newId, _fullName, _party);
        return newId;
    }

    function setCandidateStatus(uint256 _id, CandStatus _status)
        external onlyAdmin candidateExists(_id)
    {
        candidates[_id].status = _status;
        emit CandidateUpdated(_id, _status, msg.sender);
    }

    //  ELECTIONS 

    function createElection(
        string    calldata _name,
        string    calldata _description,
        uint256   _startTime,
        uint256   _endTime,
        uint256[] calldata _candIds
    ) external onlyAdmin returns (uint256) {
        require(bytes(_name).length > 0, "Name required");
        require(_endTime > _startTime, "End must be after start");
        require(_candIds.length >= 2, "Minimum 2 candidates");

        for (uint256 i = 0; i < _candIds.length; i++) {
            require(candidates[_candIds[i]].exists, "Candidate not found");
            require(candidates[_candIds[i]].status == CandStatus.Approved, "Candidate not approved");
        }

        _electionCounter++;
        uint256 newId = _electionCounter;

        elections[newId] = Election({
            id:               newId,
            name:             _name,
            description:      _description,
            startTime:        _startTime,
            endTime:          _endTime,
            status:           ElecStatus.Pending,
            candidateIds:     _candIds,
            totalVotes:       0,
            resultsPublished: false,
            exists:           true
        });
        electionIds.push(newId);
        emit ElectionCreated(newId, _name, _startTime, _endTime);
        return newId;
    }

    function setElectionStatus(uint256 _id, ElecStatus _status)
        external onlyAdmin electionExists(_id)
    {
        require(elections[_id].status != ElecStatus.Cancelled, "Already cancelled");
        elections[_id].status = _status;
        emit ElectionUpdated(_id, _status, msg.sender);
    }

    function publishResults(uint256 _id) external onlyAdmin electionExists(_id) {
        require(elections[_id].status == ElecStatus.Closed, "Must be closed first");
        require(!elections[_id].resultsPublished, "Already published");
        elections[_id].resultsPublished = true;
        emit ResultsPublished(_id, elections[_id].totalVotes);
    }

    //  VOTING 

    function castVote(
        uint256 _electionId,
        uint256 _candidateId,
        bytes32 _nonce
    ) external onlyApprovedVoter electionExists(_electionId) {
        Election storage elec = elections[_electionId];

        require(elec.status == ElecStatus.Open, "Election not open");
        require(block.timestamp >= elec.startTime, "Voting not started");
        require(block.timestamp <= elec.endTime, "Voting ended");
        require(!hasVoted[_electionId][msg.sender], "Already voted");

        bool found = false;
        for (uint256 i = 0; i < elec.candidateIds.length; i++) {
            if (elec.candidateIds[i] == _candidateId) { found = true; break; }
        }
        require(found, "Candidate not in this election");
        require(candidates[_candidateId].status == CandStatus.Approved, "Candidate not approved");

        hasVoted[_electionId][msg.sender] = true;
        voteCounts[_electionId][_candidateId]++;
        elec.totalVotes++;

        bytes32 receipt = keccak256(
            abi.encodePacked(msg.sender, _electionId, _candidateId, _nonce, block.timestamp)
        );
        voteReceipt[_electionId][msg.sender] = receipt;

        emit VoteCast(_electionId, receipt, block.timestamp);
    }

    //  VIEW FUNCTIONS 

    function getElectionCandidates(uint256 _id)
        external view electionExists(_id) returns (uint256[] memory)
    {
        return elections[_id].candidateIds;
    }

    function getVoteCount(uint256 _electionId, uint256 _candId)
        external view returns (uint256)
    {
        return voteCounts[_electionId][_candId];
    }

    function checkHasVoted(uint256 _electionId, address _voter)
        external view returns (bool)
    {
        return hasVoted[_electionId][_voter];
    }

    function getReceipt(uint256 _electionId, address _voter)
        external view returns (bytes32)
    {
        return voteReceipt[_electionId][_voter];
    }

    function getAllElectionIds() external view returns (uint256[] memory) {
        return electionIds;
    }

    function getAllCandidateIds() external view returns (uint256[] memory) {
        return candidateIds;
    }

    function getAllVoterAddresses() external view returns (address[] memory) {
        return voterAddresses;
    }

    function getTotalVoters() external view returns (uint256) {
        return voterAddresses.length;
    }

    function getTotalElections() external view returns (uint256) {
        return electionIds.length;
    }

    function getInfo() external view returns (
        address _superAdmin,
        uint256 _deployedAt,
        uint256 _totalVoters,
        uint256 _totalElections,
        uint256 _totalCandidates
    ) {
        return (
            superAdmin,
            deployedAt,
            voterAddresses.length,
            electionIds.length,
            candidateIds.length
        );
    }
}