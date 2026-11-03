/** Keep the displayed phase truthful when resetting; preserve runtime pause state. */
export function resetScene(runtime,still,select,paused=true){runtime?.seek(still);select.value=paused&&Array.from(select.options).some(option=>option.value===String(still))?String(still):'';}
