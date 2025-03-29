document.addEventListener("DOMContentLoaded", () => {
    // Accordion functionality
    const accordionItems = document.querySelectorAll(".help-accordion-item")
  
    accordionItems.forEach((item) => {
      const trigger = item.querySelector(".help-accordion-trigger")
  
      trigger.addEventListener("click", () => {
        // Toggle the active class on the clicked item
        item.classList.toggle("active")
  
        // Optional: Close other accordion items when one is opened
        // accordionItems.forEach(otherItem => {
        //     if (otherItem !== item) {
        //         otherItem.classList.remove('active');
        //     }
        // });
      })
    })
  
    // Support chat button functionality
    const chatButton = document.querySelector(".contact-option .button-primary")
    if (chatButton) {
      chatButton.addEventListener("click", () => {
        alert("Live chat support is coming soon!")
      })
    }
  
    // Documentation button functionality
    const docsButton = document.querySelector(".contact-option:nth-child(3) .button")
    if (docsButton) {
      docsButton.addEventListener("click", () => {
        // Redirect to documentation or open in new tab
        alert("Documentation will open in a new tab.")
      })
    }
  })
  
  