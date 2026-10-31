# Sustained lifecycle soak plan

**Purpose:** Close the90-second verification gap with a finite20-minute observation crossing reconnect/reservation/roomchange/resync cycles. This is not a replacement for real3D/audio/device QA or proof of no memory leak.
**Authorization:** User asks to continue and inspect directly in local browser. Parent is obtaining local computer access; no browser access-control workaround or hosting purchase.

-30-secondwarmup +1200-secondmeasured period, production20-secondreservation, seed1337,300delta sockets/3rooms,90%movingintent.
-45-secondcycles: reserveddisconnect/capacityrejection/resume; alternating deliberatevacancy/successfulcyclicroomchanges/cleanleave/refill; assertdeniedfullswitchatomicity.
-180-secondexpirycycles: absent>20s, rejectexpiredtoken, freshjoin andcleanup.
-10-secondresync burstswithinlimits; decodeeveryframe andsampleexactauthoritativestateagreement.
-10-secondmemory/heap/cadence/RTT/wire/capacity series, comparepostwarmup windows; boundharnesshistory/latency/oldsocketreferences. Neverlogresumetokens.
-Finalcloseandreservationexpiry:zerooccupants/members/tokens. Recordactualconnectedrange duringplannedchurn.
-Smokeharnessfirst, independentread-onlyreview, fixonlyreproducibledefects. No productfeature/hostingchanges. Keepcurrentpubliccandidateunlessfixneeded.

**Stopping condition:** All planned1200seconds andfinalcleanup complete, or a correctness/safetyfailure stops the run for diagnosis. Report measuredobservations, uncertainty and actualremaininglocalbrowser/hostingpermissiongates.
