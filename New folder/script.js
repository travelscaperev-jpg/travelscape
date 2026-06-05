document.addEventListener('DOMContentLoaded', () => {
  // Fetch and render Hero Slider Videos
  fetch('/api/heroSliders')
    .then(res => res.json())
    .then(videos => {
      const sliderContainer = document.getElementById('hero-video-slider');
      if (sliderContainer && videos.length > 0) {
        sliderContainer.innerHTML = videos.map((v, i) => `
          <video autoplay muted loop playsinline class="hero-video" style="display: ${i === 0 ? 'block' : 'none'};" data-index="${i}">
            <source src="${v.videoUrl}" type="video/mp4">
          </video>
        `).join('');
      }
    });

  // Fetch and render Excursions (Layer 2)
  fetchAndRender('/api/excursions', 'layer2');
  
  // Fetch and render Private Trips (Layer 3)
  fetchAndRender('/api/privateTrips', 'layer3');

  // Fetch and render Freediving (Layer 4)
  fetchAndRender('/api/freedivings', 'layer4');

  // Fetch and render Resorts (Layer 5)
  fetchAndRender('/api/resorts', 'layer5');

  // Fetch and render Photography (Layer 6)
  fetchAndRender('/api/photographys', 'layer6');

  // Fetch and render Instagram Reels
  fetch('/api/reels')
    .then(res => res.json())
    .then(reels => {
      const reelsGrid = document.getElementById('reels-grid');
      if (reelsGrid) {
        reelsGrid.innerHTML = reels.map(r => `
          <div class="video-card ratio-9-16 reel-item">
            <video src="${r.videoUrl}" loop muted onmouseover="this.play()" onmouseout="this.pause()"></video>
          </div>
        `).join('');
      }
    });

  // Fetch and render Gallery (if on gallery page)
  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid) {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(images => {
        galleryGrid.innerHTML = images.map(img => `
          <div class="card"><img src="${img.imageUrl}" class="card-img" alt="Gallery Image"></div>
        `).join('');
      });
  }

  // Booking Form Submission
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('booking-name').value,
        email: document.getElementById('booking-email').value,
        date: document.getElementById('booking-date').value,
        category: document.getElementById('booking-excursion-title').innerText,
      };
      
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Booking request submitted successfully! We will contact you soon.');
        document.getElementById('booking-modal').style.display = 'none';
        bookingForm.reset();
      } else {
        alert('Failed to submit booking. Please try again.');
      }
    });
  }
});

// Helper function to render sections with sliders
function fetchAndRender(apiUrl, layerId) {
  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) return;
      
      const bgContainer = document.getElementById(`${layerId}-bg-slides`);
      const detailsContainer = document.getElementById(`${layerId}-details-overlay`);
      
      if (bgContainer) {
        bgContainer.innerHTML = data.map((item, i) => `
          <div class="layer-bg-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${item.imageUrl || '#'}'); position: absolute; top:0; left:0; width:100%; height:100%; background-size: cover; background-position: center; opacity: ${i === 0 ? 1 : 0}; transition: opacity 1.2s ease;"></div>
        `).join('');
      }

      if (detailsContainer) {
        // Just show the first item's details as a showcase
        const item = data[0];
        detailsContainer.innerHTML = `
          <h2 class="ex-tag-title">${item.title}</h2>
          <p style="font-size: 1.1rem; margin-bottom: 20px;">${item.description}</p>
          <div class="duration-badge">From $${item.price || 0}</div>
          <br>
          <button class="btn btn-primary" onclick="openBookingModal('${item.title}')">Book Now</button>
        `;
      }
    })
    .catch(err => console.error('Failed to load ' + apiUrl, err));
}

function openBookingModal(title) {
  document.getElementById('booking-excursion-title').innerText = title;
  document.getElementById('booking-modal').style.display = 'flex';
}

document.getElementById('close-modal')?.addEventListener('click', () => {
  document.getElementById('booking-modal').style.display = 'none';
});
