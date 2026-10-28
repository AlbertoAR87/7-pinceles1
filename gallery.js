document.querySelectorAll('[data-video]').forEach(frame => {
  const button = frame.querySelector('button');
  button.hidden = false;
  button.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${frame.dataset.video}?playsinline=1`;
    iframe.title = frame.dataset.title;
    iframe.allow = 'encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'video-close';
    close.textContent = 'Cerrar vídeo';
    frame.querySelector('img').hidden = true;
    button.hidden = true;
    frame.append(iframe, close);
    close.addEventListener('click', () => {
      iframe.remove();
      close.remove();
      frame.querySelector('img').hidden = false;
      button.hidden = false;
      button.focus();
    });
    close.focus();
  });
});
