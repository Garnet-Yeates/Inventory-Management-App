/**
 * So there will be a prop called 'websiteNavigation' on one of the higher component levels
 * of the app. It will contain informtion that both the <NavigationTreeView> and <Dashboard>
 * will use. The NavigationTreeView is a simplified version of what you see on the dashboard.
 * For large screen users, this will be shown on the left side of every page (including the
 * dashboard itself!). On mobile, the 'left side of the page' will instead be a fixed display
 * triple bar thingy majigy at the top, and when clicked it will pull down a menu. 
 * 
 * So in essence we will probably have 3 different components all using the same information being
 * passed down from the top level: <DashboardPage>, <NavigationPanel>, <NavigationMobilePanel>
 * 
 * All pages will be set up in a <d-flex flex-row> outer div container, but
 * 
 * 
 * 
 */

// All pages will have this. 
const MobileFriendlyWrapper = (props) => {

    // general-app-page should 

    // general page has rfs padding so on small screens, responsive-page-container should
    // just about fill the whole screen

    // Responsive-page-container will have a max width
    // when it is small, it will have no border radius, no border, no box shadow, nada
    // when it is small it might also have a slightly gray background

    return (
        <div className="general-page-container">
            <div className="general-page">
                <div className="responsive-page-container d-flex flex-row">
                    <FixedMobileBar/>
                    <NavigationPanel/>
                    {props.children}
                </div>
            </div>
        </div>

    )

}

// Will not be displayed on md or higher
// Display fixed and we prbably want responsive-page-container to be position relative
// (so it is inside the 'gray' area on mobile)
const FixedMobileBar = () => {
    return (
        <div className="fixed-mobile-bar d-block d-md-none">

        </div>)
}

// Will ONLY be displayed on md or higher, and it will be on the left side of our 'flex-row' responsive-page
const NavigationPanel = () => {
    return (
        <div className="navigation panel d-none d-md-block">

        </div>
    )
}