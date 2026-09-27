import CustomerAccountNav from "@/components/account/CustomerAccountNav";
export default function AccountLayout({children}:{children:React.ReactNode}){
 return <><CustomerAccountNav/>{children}</>;
}