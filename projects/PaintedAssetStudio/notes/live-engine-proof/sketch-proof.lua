-- easel session "sketch-proof": a painting replayed chunk by chunk.
-- Each "--@ chunk" line starts one chunk as it was run at the easel.
--@ engine 5
--@ sketch

--@ chunk 1
canvas{size=300,aspect=1.5,seed=99,linen=18,ground={{pile={{"lead white",4},{"raw umber",1}},um=100,apply="knife"}}}

--@ chunk 2
p=pile{{"yellow ochre",2},{"lead white",1}}; work(ellipse(500,333,120,120),{pile=p,hand="broad",coverage=2,clip=true})
