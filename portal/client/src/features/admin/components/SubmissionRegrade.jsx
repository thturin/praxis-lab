
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SubmissionRegrade = ({ assignmentId, selectedSection = null, onRegradeApplied = () => { }, submissions = [] }) => {
  const [status, setStatus] = useState(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [dryRunSummaries, setDryRunSummaries] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [showSubmissionSelector, setShowSubmissionSelector] = useState(false);
  const [showLatePenalty, setShowLatePenalty] = useState(true);
  const abortPollingRef = useRef(false); //to abort async polling if async clearQueue is clicked 

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Reset selected submissions when assignment or section changes
  useEffect(() => {
    setSelectedSubmissions([]);
    setShowSubmissionSelector(false);
  }, [assignmentId, selectedSection]);

  const toggleSubmissionSelection = (submissionId) => {
    setSelectedSubmissions(prev =>
      prev.includes(submissionId) //if submissionId already exists in group, it is getting unselected
        ? prev.filter(id => id !== submissionId) //remove it from the array
        : [...prev, submissionId]//if it does not exist, add it to the array
    );
  };
  //if user selects all, setSelected submissions to empty, else setSelected submissions to all submission ids
  const toggleSelectAll = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map(sub => sub.id));
    }
  };

  const pollJobStatus = async (jobId) => {
    const maxAttempts = 360; // wait up to ~6 minutes
    let lastState = null;
    abortPollingRef.current = false; // Reset abort flag at start
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortPollingRef.current) { //if user clicked clearQueue button, abort polling
        console.log('Polling aborted for jobId', jobId);
        return null;
      }
      try {
        const statusRes = await axios.get(
          //print logs 
          `${process.env.REACT_APP_API_HOST}/submissions/regrade/${jobId}`,
          {
            headers: { 'Cache-Control': 'no-cache' },
            params: { t: Date.now() } // cache bust to avoid 304 with empty body
          }
        );
        const { state } = statusRes.data || {};
        lastState = state;
        if (state === 'completed' || state === 'failed') {
          return statusRes.data;
        }
      } catch (err) {
        console.error('pollJobStatus error', err.response?.data || err.message);
        return null;
      }
      await sleep(1000);
    }
    console.warn('pollJobStatus timed out', { jobId, lastState });
    return null;
  };

  const runRegrade = async (dryRun) => {
    const setLoadingState = dryRun ? setDryRunLoading : setApplyLoading;
    setLoadingState(true);
    try {
      if (dryRun) setDryRunSummaries([]);
      const resolvedSectionId = (!selectedSection || selectedSection === '-1') ? null : selectedSection;

      // If specific submissions selected, send their IDs; otherwise send null for all
      const submissionIds = selectedSubmissions.length > 0 ? selectedSubmissions : null;

      const res = await axios.post(`${process.env.REACT_APP_API_HOST}/submissions/regrade`, {
        assignmentId,
        dryRun,
        sectionId: resolvedSectionId,
        submissionIds, // Add selected submission IDs
        showLatePenalty
      });
      const statusData = await pollJobStatus(res.data.jobId);
      if (!statusData) {
        // Only set timeout message if not aborted
        if (!abortPollingRef.current) {
          setStatus(`${dryRun ? 'Dry run' : 'Regrade'} timed out before finishing.`);
        }
        return;
      }

      if (statusData.state === 'failed') {
        throw new Error(statusData.result?.error || 'Regrade worker failed');
      }

      if (dryRun) {
        setDryRunSummaries(statusData.result.summaries || []);
        setStatus(`Dry regrade completed. Processed ${statusData.result.count || 0} submissions.`);
      } else {
        setStatus('Regrade applied. Scores are being updated in the database.');
        setDryRunSummaries([]);
        onRegradeApplied(); //tells the labpreview to refresh
      }
    } catch (err) {
      if (!abortPollingRef.current) {
        setStatus(`Failed to queue ${dryRun ? 'dry run' : 'regrade'}: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      // Don't reset loading state if aborted (clearQueue already did it)
      if (!abortPollingRef.current) {
        setLoadingState(false);
      }
    }
  };

  const clearQueue = async () => {
    // Abort polling immediately
    abortPollingRef.current = true;
    setDryRunLoading(false);
    setApplyLoading(false);

    try {
      await axios.delete(`${process.env.REACT_APP_API_HOST}/submissions/regrade/clear-queue`);
      setStatus('Regrade queue cleared');
    } catch (err) {
      console.error('Clear queue error:', err);
      setStatus(`Error clearing queue: ${err.response?.data?.error || err.message}`);
    } finally {
      // Always clear summaries regardless of success/failure
      setDryRunSummaries([]);
    }
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Submission selector toggle */}
      {submissions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowSubmissionSelector(!showSubmissionSelector)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              fontWeight: '500',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              backgroundColor: '#fff',
              color: '#374151'
            }}
          >
            {showSubmissionSelector ? '▼' : '▶'} Select Specific Submissions ({selectedSubmissions.length} selected)
          </button>
        </div>
      )}

      {/* Submission selector */}
      {showSubmissionSelector && submissions.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: '#f9fafb',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={selectedSubmissions.length === submissions.length}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer' }}
            />
            <strong>Select All ({submissions.length} submissions)</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {submissions.map(sub => (
              <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedSubmissions.includes(sub.id)}
                  onChange={() => toggleSubmissionSelection(sub.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span>
                  {sub.user?.username || `User ${sub.userId}`} -
                  Score: {sub.score?.toFixed(1) || '0'}% -
                  Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* //DRY RUN REGRADE BUTTON */}
      <button
        onClick={() => runRegrade(true)}
        disabled={dryRunLoading || applyLoading || !assignmentId}
        style={{
          padding: '10px 16px',
          borderRadius: '6px',
          fontWeight: '600',
          border: 'none',
          cursor: (dryRunLoading || applyLoading || !assignmentId) ? 'not-allowed' : 'pointer',
          opacity: (dryRunLoading || applyLoading || !assignmentId) ? 0.6 : 1,
          backgroundColor: '#4f46e5',
          color: '#fff'
        }}
      >
        {dryRunLoading ? 'Queuing…' : selectedSubmissions.length > 0
          ? `Dry Regrade ${selectedSubmissions.length} Selected`
          : 'Dry Regrade All Submissions'}
      </button>

      {dryRunSummaries.length > 0 && ( //if ther was a dry run queued, show the button to actually run regrade and apply submissions
        <>
          <button
            onClick={() => runRegrade(false)}
            disabled={applyLoading || !assignmentId}
            style={{
              marginLeft: '12px',
              padding: '10px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              border: 'none',
              cursor: applyLoading || !assignmentId ? 'not-allowed' : 'pointer',
              opacity: applyLoading || !assignmentId ? 0.6 : 1,
              backgroundColor: '#059669',
              color: '#fff'
            }}
          >
            {applyLoading ? 'Applying…' : 'Apply Regrade Updates'}
          </button>

          {/* LATE PENALTY CHECKBOX */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <input
              type="checkbox"
              id="showLatePenalty"
              checked={showLatePenalty}
              onChange={(e) => setShowLatePenalty(e.target.checked)}
              style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
            />
            <label htmlFor="showLatePenalty" style={{ fontSize: '14px', cursor: 'pointer' }}>
              Include late penalty
            </label>
          </div>


        </>
      )}

      <button
        onClick={clearQueue}
        disabled={applyLoading}
        style={{
          marginLeft: '12px',
          padding: '10px 16px',
          borderRadius: '6px',
          fontWeight: '600',
          border: 'none',
          cursor: applyLoading ? 'not-allowed' : 'pointer',
          opacity: applyLoading ? 0.6 : 1,
          backgroundColor: '#dc2626',
          color: '#fff'
        }}
      >
        Clear Results
      </button>

      {status && <p style={{ marginTop: '0.5rem' }}>{status}</p>}
      {dryRunSummaries.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong>Dry Run Results</strong>
          <ul style={{ marginTop: '0.5rem' }}>
            {dryRunSummaries.map(summary => (
              <li key={summary.submissionId} style={{ marginBottom: '0.5rem' }}>
                <div>Submission #{summary.submissionId} ({summary.user || 'unknown'}) [{summary.type}]</div>
                {summary.type === 'lab' && (
                  <div>
                    <div>Final Score: {summary.finalScore?.percent || '0'}% ({summary.finalScore?.totalScore || 0}/{summary.finalScore?.maxScore || 0})</div>
                    {/* <pre style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', overflowX: 'auto' }}>
                      {JSON.stringify(summary.gradedResults, null, 2)}
                    </pre> */}
                  </div>
                )}
                {summary.type === 'github' && (
                  <div>
                    <div>Score: {summary.result?.score ?? 0}</div>
                    {summary.result?.output && (
                      <pre style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', overflowX: 'auto' }}>
                        {summary.result.output}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}


    </div>
  );
};

export default SubmissionRegrade;
